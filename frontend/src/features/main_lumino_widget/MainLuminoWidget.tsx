import { createRoot } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import { Provider } from "react-redux";
import { store } from "../../app/store";
import {
  IAppWidget,
  activateWidget,
  deleteWidget,
  selectAppWidgets,
  addOrActivateMainTreeNavigationWidget,
  addOrActivateSettingsWidget,
  IWidgetUidToCmpRootHashMap,
  addOrActivateVersionsWidget,
} from "./MainLuminoWidgetSlice";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  BoxPanel,
  DockPanel,
  SplitLayout,
  SplitPanel,
  //StackedPanel,
  Widget,
} from "@lumino/widgets";

import { UDSScanReport } from "../uds_scan_report/UDSScanReport";
import { TreeNavigation } from "../../App";
import { ImpressumText } from "../impressum/ImpressumText";
import { ThemeProvider } from "@mui/material/styles";
import { SidePannelSettings } from "../settings/Settings";
import { selectSettings } from "../settings/SettingsSlice";
import { Versions } from "../versions/Versions";
import { ExternalLicenses } from "../external_licenses/ExternalLicenses";

import "./MainLuminoWidget.css";
import { logger } from "../../app/logging";
import SearchBar from "../search/SearchBar";

import ResultsTable from "../search/ResultsTable";

interface IWrappedLuminoWidgetEventDetail {
  detail: {
    uid: string;
  };
}

type TWrappedLuminoWidgetEventType = "activate" | "close";

interface ILuminoWidgetExtraAttributes {
  [attr: string]: any;
}

class WrappedLuminoWidget extends Widget {
  uid: string; // unique widget id
  name: string; // some name
  rootWidgetReference: HTMLDivElement; // used for event dispatching to react

  constructor(
    uid: string,
    name: string,
    rootWidgetReference: HTMLDivElement,
    extraAnchorDivNodeAttributes: ILuminoWidgetExtraAttributes
  ) {
    // NOTE: rootWidgetReference is the div element that all widgets have as
    //       ancestor, it is used here for event dispatching
    //       (communicate updates to react)

    // create a div node used as "anchor" by this lumino widget
    const anchorDIVNode = document.createElement("div");

    for (let attr in extraAnchorDivNodeAttributes) {
      anchorDIVNode.setAttribute(attr, extraAnchorDivNodeAttributes[attr]);
    }

    anchorDIVNode.setAttribute("id", uid);
    super({ node: anchorDIVNode });

    this.uid = uid;
    this.name = name;
    this.rootWidgetReference = rootWidgetReference;

    this.setFlag(Widget.Flag.DisallowLayout);
    this.addClass("luminoWidgetContent");

    this.title.label = name;
    this.title.closable = true;
  }

  /*
    A message handler invoked on an 'activate-request' message.
    (widget was selected)
     */
  onActivateRequest(msg: any) {
    this.forwardEventToReact("activate");
    super.onActivateRequest(msg);
  }

  /*
    A message handler invoked on a 'close-request' message.
    (widget was closed)
     */
  onCloseRequest(msg: any) {
    this.forwardEventToReact("close");
    super.onCloseRequest(msg);
  }

  private forwardEventToReact(event: TWrappedLuminoWidgetEventType) {
    const customEventDetail: IWrappedLuminoWidgetEventDetail = {
      detail: {
        uid: this.uid,
      },
    };
    const customEvent = new CustomEvent(
      `lumino:widget:${event}`,
      customEventDetail
    );
    this.rootWidgetReference.dispatchEvent(customEvent);
  }
}

const makeReactComponent = (widget: IAppWidget): any => {
  const DefaultComponent = () => {
    return <div>Unknown component</div>;
  };
  switch (widget.content.componentType) {
    case "MAINTREENAVIGATION":
      return TreeNavigation;
    case "UDSSCANREPORT":
      return UDSScanReport;
    case "IMPRESSUM":
      return ImpressumText;
    case "EXTERNALLICENSES":
      return ExternalLicenses;
    case "SETTINGS":
      return SidePannelSettings;
    case "VERSIONS":
      return Versions;
    default:
      logger.debug(`COMPONENT NOT FOUND ${widget.content.componentType}`);
      return DefaultComponent;
  }
};

//                           Vspl
//            <---------------------------------------------->
//      +----+----------------+-------------------------------+
//      |    |                |                               |   ^         ^
//      |    |                |                               |   |         |
//      |Siba|   Menu         |   Dock                        |   |         |
//      |    |                |                               |   |         |
//      |    |                |                               |   |  Tbox   |  Hspl
//      |    |                |                               |   |         |
//      |    |                |                               |   |         |
//      |    |                |                               |   v         |
//      +----+----------------+-------------------------------+             |
//      |  Term                                               |             |
//      |                                                     |             |
//      |                                                     |             v
//      +-----------------------------------------------------+
//      |  Boba                                               |
//      +-----------------------------------------------------+
//

const luminoMainPanel = new BoxPanel();
const luminoHsplPanel = new SplitPanel({ orientation: "vertical" });
const luminoVsplPanel = new SplitPanel({ orientation: "horizontal" });
const luminoMenuHsplPanel = new BoxPanel();
const luminoBobaPanel = new BoxPanel({ direction: "left-to-right" });
const luminoTboxPanel = new BoxPanel({ direction: "left-to-right" });
const luminoSibaPanel = new BoxPanel();
const luminoMenuPanel = new BoxPanel();
const luminoVersionPanel = new BoxPanel();
const luminoTermPanel = new DockPanel();
const luminoDockPanel = new DockPanel();

// NOTE: use a global variable as storage for the rendered app widgets because the state inside the lumino widgets
//       yields race conditions in conjunction with the "special widgets" (side panel / navigation tree / version panel)
// TODO: find a better solution
let renderedAppWidgetUids: string[] = [];

interface DataEntry {
  time: string;
  flags: string;
  identifier: string;
  length: number;
  reserved: number;
  data: string;
  type: string;
}

export const MainLuminoWidget = (props: any) => {
  const [searchResults, setSearchResults] = useState<DataEntry[]>([]);

  const [showResultsTable, setShowResultsTable] = useState(true);

  const mainLuminoWidgetReference = useRef<HTMLDivElement>(null);

  // const [searchResults, setSearchResults] = useState([]);
  const allAppWidgets = useAppSelector(selectAppWidgets);
  //const [renderedAppWidgetUids, setRenderedAppWidgetUids] = useState<string[]>([])

  const settings = useAppSelector(selectSettings);
  const [widgetUidToCompRootMap, setWidgetUidToCompRootMap] =
    useState<IWidgetUidToCmpRootHashMap>({});

  const dispatch = useAppDispatch();

  useEffect(() => {
    // add and render the lumino widgets
    if (mainLuminoWidgetReference.current === null) {
      return;
    }

    let allAppWidgetUids: Set<string> = new Set();
    let activeAppWidgetUid: string = "";

    allAppWidgets.forEach((widget) => {
      // TODO: right now this handling will create a lumino widget and then render it to the (react) DOM
      //       the rendering will only happen once and so a react component would not see any props change
      //       (redux store state changes should work without problems). So think about "updating" the DOM
      //       in case that a widget changed its active state

      logger.debug(
        `handling widget with uid ${widget.uid} (active - ${widget.active})`
      );

      allAppWidgetUids.add(widget.uid);

      if (widget.active) {
        activeAppWidgetUid = widget.uid;
      }

      if (renderedAppWidgetUids.includes(widget.uid)) {
        logger.debug("already rendered this widget");
        return;
      }

      logger.debug(
        `rendering widget (uid: ${widget.uid} name: "${widget.name}")`
      );

      // FIXME: this still needs a better solution
      let extraWidgetDivNodeAttributes: ILuminoWidgetExtraAttributes = {};
      if (widget.uid === "MAINTREENAVIGATION") {
        extraWidgetDivNodeAttributes["style"] = "min-width: 280px";
      }
      const newLuminoWidget = new WrappedLuminoWidget(
        widget.uid,
        widget.name,
        mainLuminoWidgetReference.current!,
        extraWidgetDivNodeAttributes
      );
      if (widget.uid === "MAINTREENAVIGATION") {
        // TODO: Maybe define which panel to place the widget in somewhere else
        luminoMenuPanel.addWidget(newLuminoWidget);
        /*
            } else if (widget.uid === 'TERMINAL') {
                luminoTermPanel.addWidget(newLuminoWidget)
            */
      } else if (widget.uid === "SETTINGS") {
        luminoSibaPanel.addWidget(newLuminoWidget);
      } else if (widget.uid === "VERSIONS") {
        luminoVersionPanel.addWidget(newLuminoWidget);
      } else {
        luminoDockPanel.addWidget(newLuminoWidget);
      }

      renderedAppWidgetUids = [...renderedAppWidgetUids, widget.uid];
      //setRenderedAppWidgetUids((currentUids) => [...currentUids, widget.uid])

      const luminoWidgetAnchorDIVNode = document.getElementById(widget.uid);
      if (luminoWidgetAnchorDIVNode) {
        logger.debug(
          `rendering DOM for widget (uid: ${widget.uid} name: "${widget.name}")`
        );

        const ReactComponent = makeReactComponent(widget);
        const componentRoot = createRoot(luminoWidgetAnchorDIVNode);
        setWidgetUidToCompRootMap((widgetUidToCompRootMap) => {
          widgetUidToCompRootMap[widget.uid] = componentRoot;
          return widgetUidToCompRootMap;
        });
        componentRoot.render(
          <Provider store={store}>
            <ThemeProvider theme={props.theme}>
              <ReactComponent {...widget.content.props} />
            </ThemeProvider>
          </Provider>
        );
      }
    });

    // remove deleted app widgets from the list of rendered widgets
    const stillExistingRenderedAppWidgetUids = renderedAppWidgetUids.filter(
      (uid) => allAppWidgetUids.has(uid)
    );
    if (
      stillExistingRenderedAppWidgetUids.length < renderedAppWidgetUids.length
    ) {
      renderedAppWidgetUids = stillExistingRenderedAppWidgetUids;
      // setRenderedAppWidgetUids(updatedRenderedAppWidgetUids)
      setWidgetUidToCompRootMap((widgetUidToCompRootMap) => {
        const updatedWidgetUidToCompRootMap: IWidgetUidToCmpRootHashMap = {};
        Object.keys(widgetUidToCompRootMap).forEach((widgetUid) => {
          if (stillExistingRenderedAppWidgetUids.includes(widgetUid)) {
            updatedWidgetUidToCompRootMap[widgetUid] =
              widgetUidToCompRootMap[widgetUid];
          } else {
            // unmount the component and all of its children
            setTimeout(() => widgetUidToCompRootMap[widgetUid].unmount());
          }
        });
        return updatedWidgetUidToCompRootMap;
      });
    }

    // sync the application widgets with the actual lumino widgets (activate / delete)
    const it = luminoDockPanel.widgets();
    let widget = it.next();
    while (widget) {
      if (widget.id === activeAppWidgetUid) {
        luminoDockPanel.selectWidget(widget);
      }
      if (!allAppWidgetUids.has(widget.id)) {
        widget.close();
      }
      widget = it.next();
    }

    // handle toggle button
    if (settings.isExpandedNavTree) {
      if (luminoMenuHsplPanel.isHidden) {
        luminoMenuHsplPanel.show();
      }
    } else {
      if (luminoMenuHsplPanel.isVisible) {
        luminoMenuHsplPanel.hide();
      }
    }
  }, [
    mainLuminoWidgetReference,
    allAppWidgets,
    settings.isExpandedNavTree,
    props.theme,
    widgetUidToCompRootMap,
  ]);

  useEffect(() => {
    // setup and attach the lumino panels
    if (
      mainLuminoWidgetReference.current === null ||
      luminoMainPanel.isAttached
    ) {
      return;
    }

    logger.debug("setting up the lumino panels");

    luminoMainPanel.id = "luminoMainPanel";
    luminoMainPanel.addClass("luminoMainPanel");
    luminoMainPanel.addWidget(luminoHsplPanel);
    luminoMainPanel.addWidget(luminoBobaPanel);

    luminoHsplPanel.id = "luminoHsplPanel";
    luminoHsplPanel.addWidget(luminoTboxPanel);
    luminoHsplPanel.addWidget(luminoTermPanel);
    BoxPanel.setStretch(luminoHsplPanel, 1);
    (luminoHsplPanel.layout as SplitLayout).setRelativeSizes([1, 0]);

    luminoTboxPanel.id = "luminoTboxPanel";
    luminoTboxPanel.addWidget(luminoSibaPanel);
    luminoTboxPanel.addWidget(luminoVsplPanel);
    SplitPanel.setStretch(luminoTboxPanel, 1);

    luminoVsplPanel.id = "luminoVsplPanel";
    luminoVsplPanel.addWidget(luminoMenuHsplPanel);
    luminoVsplPanel.addWidget(luminoDockPanel);
    BoxPanel.setStretch(luminoVsplPanel, 1);

    luminoMenuHsplPanel.id = "luminoMenuHsplPanel";
    luminoMenuHsplPanel.addClass("luminoMenuHsplPanel");

    luminoMenuHsplPanel.addWidget(luminoMenuPanel);
    luminoMenuHsplPanel.addWidget(luminoVersionPanel);

    luminoSibaPanel.addClass("luminoSibaPanel");

    luminoSibaPanel.id = "luminoSibaPanel";

    luminoBobaPanel.addClass("luminoBobaPanel");
    luminoBobaPanel.id = "luminoBobaPanel";
    /*
        luminoBobaPanel.addWidget(new Widget({node: (()=>{
                const node = document.createElement('div')
                const btn = document.createElement('button')
                node.appendChild(btn)
                btn.innerText = 'Toggle Terminal'
                btn.onclick = () => {
                    if (luminoTermPanel.isHidden) {
                        luminoTermPanel.show()
                    } else {
                        luminoTermPanel.hide()
                    }
                }
                node.style.minHeight = '32px'
                return node
        })()}))
        */
    luminoTermPanel.id = "luminoTermPanel";
    luminoTermPanel.hide();

    luminoMenuPanel.id = "luminoMenuPanel";
    luminoVersionPanel.id = "luminoVersionPanel";
    (luminoVsplPanel.layout as SplitLayout).setRelativeSizes([0, 1]);
    // logger.debug(luminoVsplPanel.layout)

    luminoDockPanel.id = "luminoDockPanel";
    SplitPanel.setStretch(luminoDockPanel, 1);

    Widget.attach(luminoMainPanel, mainLuminoWidgetReference.current);
    window.onresize = () => luminoMainPanel.update();

    mainLuminoWidgetReference.current.addEventListener(
      "lumino:widget:activate",
      (e: Event) => {
        const event = e as unknown as IWrappedLuminoWidgetEventDetail;
        dispatch(activateWidget(event.detail.uid));
      }
    );

    mainLuminoWidgetReference.current.addEventListener(
      "lumino:widget:close",
      (e: Event) => {
        const event = e as unknown as IWrappedLuminoWidgetEventDetail;
        dispatch(deleteWidget(event.detail.uid));
      }
    );

    // add / show some widgets on startup

    // Add the SearchBar to the luminoMenuPanel
    const searchBarAnchorDIVNode = document.createElement("div");
    searchBarAnchorDIVNode.setAttribute("id", "searchBar");
    searchBarAnchorDIVNode.classList.add("searchBar");
    const searchBarWidget = new WrappedLuminoWidget(
      "searchBar",
      "Search",
      mainLuminoWidgetReference.current,
      {}
    );
    luminoMenuPanel.addWidget(searchBarWidget);

    // Render the SearchBar component
    const searchBarAnchorDiv = document.getElementById("searchBar");
    if (searchBarAnchorDiv) {
      const searchBarRoot = createRoot(searchBarAnchorDiv);

      searchBarRoot.render(
        <Provider store={store}>
          <ThemeProvider theme={props.theme}>
            <SearchBar
              onSearchResults={(results) => {
                setSearchResults(results);
                setShowResultsTable(true);
              }}
              style={{
                position: "absolute",
                top: "30px",
                left: "10px",
                zIndex: 1000,
                backgroundColor: "white",
                padding: "10px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            />
          </ThemeProvider>
        </Provider>
      );
    }

    dispatch(addOrActivateMainTreeNavigationWidget());
    dispatch(addOrActivateSettingsWidget());
    dispatch(addOrActivateVersionsWidget());

    //dispatch(addOrActivateTestTerminalWidget())
  }, [mainLuminoWidgetReference, dispatch, props.theme]);

  useEffect(() => {
    return () => {
      // unmount the SearchBar component
      const searchBarCompRoot = widgetUidToCompRootMap["searchBar"];
      if (searchBarCompRoot) {
        searchBarCompRoot.unmount();
      }
    };
  }, [widgetUidToCompRootMap]);

  useEffect(() => {
    // update the lumino widgets
    if (mainLuminoWidgetReference.current === null) {
      return;
    }

    allAppWidgets.forEach((widget) => {
      // FIXME: this should not re-render (actually recreating) the whole component
      const compRoot = widgetUidToCompRootMap[widget.uid];
      if (compRoot === undefined) {
        return;
      }
      const ReactComponent = makeReactComponent(widget);
      compRoot.render(
        <Provider store={store}>
          <ThemeProvider theme={props.theme}>
            <ReactComponent {...widget.content.props} />
          </ThemeProvider>
        </Provider>
      );
    });
  }, [
    settings.isDarkTheme,
    props.theme,
    widgetUidToCompRootMap,
    allAppWidgets,
  ]);

  const handleResultsTableClose = () => {
    setShowResultsTable(false);
  };

  return (
    <div ref={mainLuminoWidgetReference} className={"luminoMainPanel"}>
      {showResultsTable && searchResults.length > 0 && (
        <ResultsTable data={searchResults} onClose={handleResultsTableClose} />
      )}
    </div>
  );
};
