import React, { useEffect, useMemo, useState } from "react";
import { store } from "./app/store";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import {
  IAppWidget,
  selectAppWidgets,
  addOrActivateUDSScanRunWidget,
  addOrActivateUDSScanReportWidget,
  addOrActivateFakeUDSScanReportWidget,
  addOrActivateImpressumWidget,
  addOrActivateExternalLicensesWidget,
  addOrActivateGlobalLiveDataWidget,
  addOrActivateUserWidget,
  addOrActivateUserManagementWidget,
  addOrActivateGroupManagementWidget,
} from "./features/main_lumino_widget/MainLuminoWidgetSlice";
import {
  fetchAllUDSScanRunsAsync,
  selectUDSScanRuns,
  subscribeToUDSScanRunChanges,
} from "./features/uds_scan_run/UDSScanRunsSlice";
import {
  fetchAllBackendEventsAsync,
  showBackendEvent,
  subscribeToBackendEventChanges,
} from "./features/backend_event/BackendEventSlice";

import { MainLuminoWidget } from "./features/main_lumino_widget/MainLuminoWidget";
import { UserMessage } from "./features/user_message/UserMessage";
import { BackendEventDialog } from "./features/backend_event/BackendEventDialog";
import { UDSScanRunReports } from "./features/uds_scan_report/UDSScanReport";
import { Impressum } from "./features/impressum/Impressum";

import TreeView from "@mui/lab/TreeView";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TreeItem from "@mui/lab/TreeItem";
import Box from "@mui/material/Box";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  selectIsLoggedIn,
  selectSettings,
} from "./features/settings/SettingsSlice";
import CssBaseline from "@mui/material/CssBaseline";
import { amber, grey } from "@mui/material/colors";
import { useTranslation } from "react-i18next";
import { fetchSystemDataAsync } from "./features/system_data/SystemDataSlice";
import {
  fetchAllUserMessagesAsync,
  subscribeToUserMessageChanges,
} from "./features/user_message/UserMessageSlice";
import {
  fetchAllUserDataAsync,
  selectUserDataAsObject,
  subscribeToUserDataChanges,
  updateUserDataObjectAsync,
} from "./features/settings/UserDataSlice";
import { userDataEulaAccepted } from "./features/misc/Constants";
import { logger } from "./app/logging";

import "@fontsource/share-tech-mono";

import "./App.css";
import { ConditionalFragment, isRunningAs } from "./features/misc/Util";

// add "body3" type for Typography variant
// -> is used for "hacky" font (e.g. UDS Scan Report table data)
declare module "@mui/material/styles" {
  interface TypographyVariants {
    body3: React.CSSProperties;
  }

  // allow configuration using `createTheme`
  interface TypographyVariantsOptions {
    body3?: React.CSSProperties;
  }
}

// Update the Typography's variant prop options
declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    body3: true;
  }
}

// add "body3" type for Typography variant
// -> is used for "hacky" font (e.g. UDS Scan Report table data)
declare module "@mui/material/styles" {
  interface TypographyVariants {
    body3: React.CSSProperties;
  }

  // allow configuration using `createTheme`
  interface TypographyVariantsOptions {
    body3?: React.CSSProperties;
  }
}

// Update the Typography's variant prop options
declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    body3: true;
  }
}

// add "body3" type for Typography variant
// -> is used for "hacky" font (e.g. UDS Scan Report table data)
declare module "@mui/material/styles" {
  interface TypographyVariants {
    body3: React.CSSProperties;
  }

  // allow configuration using `createTheme`
  interface TypographyVariantsOptions {
    body3?: React.CSSProperties;
  }
}

// Update the Typography's variant prop options
declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    body3: true;
  }
}

export const TreeNavigation = () => {
  const udsScanRuns = useAppSelector(selectUDSScanRuns);
  const appWidgets: IAppWidget[] = useAppSelector(selectAppWidgets);
  const settings = useAppSelector(selectSettings);

  const [expandedTreeNodes, setExpandedTreeNodes] = useState<string[]>([]);
  const [selectedTreeNodeItem, setSelectedTreeItem] = useState("");

  const { t } = useTranslation();

  const dispatch = useAppDispatch();

  const getRootTreeNodeIdsFor = (nodeId: string): string[] | [] => {
    const parts = nodeId.split("::");
    switch (parts[0]) {
      case "ISOTPENDPOINTSCANRUN":
        return parts[1] === undefined
          ? []
          : ["ADDISOTPENDPOINTS", "ISOTPENDPOINTSCANRUN"];
      case "UDSSCANRUN":
        return parts[1] === undefined ? [] : ["UDSSCANRUN"];
      case "ISOTPENDPOINTCONFIG":
        return parts[1] === undefined ? [] : ["ISOTPENDPOINTS"];
      case "USER":
        return parts[1] === undefined ? [] : ["SETTINGS", "USER"];
      case "USERMANAGEMENT":
        return parts[1] === undefined ? [] : ["SETTINGS", "USERMANAGEMENT"];
      case "GROUPMANAGEMENT":
        return parts[1] === undefined ? [] : ["SETTINGS", "GROUPMANAGEMENT"];
      default:
        return [];
    }
  };

  useEffect(() => {
    // there should only be one active widget at any given time (TM)
    const activeAppWidget = appWidgets
      .filter((appWidget) => appWidget.active)
      .pop();
    if (activeAppWidget === undefined) {
      return;
    }
    if (selectedTreeNodeItem !== activeAppWidget!.uid) {
      // select the tree view node item
      setSelectedTreeItem(activeAppWidget!.uid);
      // expand the root nodes for that item as needed
      getRootTreeNodeIdsFor(activeAppWidget!.uid).forEach((rootTreeNodeId) => {
        if (!expandedTreeNodes.includes(rootTreeNodeId)) {
          setExpandedTreeNodes((curExpandedTreeNodes) => [
            ...curExpandedTreeNodes,
            rootTreeNodeId,
          ]);
        }
      });
    }
  }, [appWidgets, selectedTreeNodeItem, expandedTreeNodes]);

  const handleTreeNodeToggle = (_: React.SyntheticEvent, nodeIds: string[]) => {
    setExpandedTreeNodes(nodeIds);
  };

  const handleTreeNodeSelect = (_: React.SyntheticEvent, nodeId: string) => {
    logger.debug(`selected tree item - ${nodeId}`);

    const parts = nodeId.split("::");

    // NOTE: the tree view item labels correspond to the lumino widget ids
    //       (that way its possible to easily select the tree view item for the currently active widget)

    switch (parts[0]) {
      case "UDSSCANRUN":
        const udsScanRun = udsScanRuns.filter(
          (udsScanRun) => udsScanRun.id === parseInt(parts[1])
        )[0];
        dispatch(addOrActivateUDSScanRunWidget(udsScanRun));
        break;
      case "REPORTUDSSCANRUN":
        const reportUdsScanRun = udsScanRuns.filter(
          (udsScanRun) => udsScanRun.id === parseInt(parts[1])
        )[0];
        dispatch(addOrActivateUDSScanRunWidget(reportUdsScanRun));
        break;
      case "BACKENDEVENT":
        dispatch(showBackendEvent(parseInt(parts[1])));
        break;
      case "UDSSCANREPORT":
        const udsScanReport = udsScanRuns.flatMap((udsScanRun) =>
          udsScanRun.scan_run_findings.filter(
            (udsScanRunFinding) => udsScanRunFinding.id === parseInt(parts[1])
          )
        )[0];
        if (udsScanReport !== undefined) {
          dispatch(addOrActivateUDSScanReportWidget(udsScanReport));
        } else {
          // show the "fake" scan report as a demo
          dispatch(
            addOrActivateFakeUDSScanReportWidget({
              id: -1,
              created_at: "",
              results_file: "results/EXAMPLE.json.gz",
              analyzer_results: [],
              log_files: [
                {
                  id: -1,
                  created_at: "",
                  log_type: "CAN",
                  log_file: "logfiles/can-EXAMPLE.log.gz",
                },
                {
                  id: -1,
                  created_at: "",
                  log_type: "UDS",
                  log_file: "logfiles/uds-EXAMPLE.log.gz",
                },
                {
                  id: -1,
                  created_at: "",
                  log_type: "SCANNER",
                  log_file: "logfiles/scan_run-EXAMPLE.log.gz",
                },
              ],
            })
          );
        }
        break;
      case "GLOBALLIVEDATA":
        dispatch(addOrActivateGlobalLiveDataWidget());
        break;
      case "IMPRESSUM":
        dispatch(addOrActivateImpressumWidget());
        break;
      case "EXTERNALLICENSES":
        dispatch(addOrActivateExternalLicensesWidget());
        break;
      case "USER":
        dispatch(addOrActivateUserWidget());
        break;
      case "USERMANAGEMENT":
        dispatch(addOrActivateUserManagementWidget());
        break;
      case "GROUPMANAGEMENT":
        dispatch(addOrActivateGroupManagementWidget());
        break;
      default:
        logger.debug(`no handler for selected tree view item - ${nodeId}`);
        break;
    }
  };

  return (
    </*navigation tree*/>
      <Box sx={{ width: "100%", height: "100%", overflowY: "auto" }}>
        <Box
          sx={{
            width: "100px",
            display: "block",
            marginLeft: "auto",
            marginRight: "auto",
            paddingBottom: "10px",
          }}
          component="img"
          src={
            settings.isDarkTheme
              ? process.env.PUBLIC_URL + "/dissecto718x366_dark.png"
              : process.env.PUBLIC_URL + "/dissecto718x366.png"
          }
        />
        <TreeView
          aria-label="widget-navigation"
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpandIcon={<ChevronRightIcon />}
          onNodeSelect={handleTreeNodeSelect}
          selected={selectedTreeNodeItem}
          onNodeToggle={handleTreeNodeToggle}
          expanded={expandedTreeNodes}
          className="TreeViewNavigation"
        >
          <UDSScanRunReports />
          <TreeItem nodeId="LEGAL" label={t("Legal")}>
            <Impressum />
            <TreeItem
              nodeId="EXTERNALLICENSES"
              label={t("Open Source Licenses")}
            />
          </TreeItem>
        </TreeView>
      </Box>
    </>
  );
};

export const fetchAndSubscribeAllData = () => {
  logger.debug("fetch and subscribe to user data changes");
  store.dispatch(fetchAllUserDataAsync());
  store.dispatch(subscribeToUserDataChanges());

  logger.debug("fetch system data");
  store.dispatch(fetchSystemDataAsync());

  logger.debug("fetch and subscribe to user message changes");
  store.dispatch(fetchAllUserMessagesAsync());
  store.dispatch(subscribeToUserMessageChanges());

  logger.debug("fetch and subscribe to backend event changes");
  store.dispatch(fetchAllBackendEventsAsync());
  store.dispatch(subscribeToBackendEventChanges());

  if (process.env.REACT_APP_PERSONALITY_NAME === "HydraScope") {
    logger.debug("fetch and subscribe to uds scan run changes");
    store.dispatch(fetchAllUDSScanRunsAsync());
    store.dispatch(subscribeToUDSScanRunChanges());
  }
};

function App() {
  const settings = useAppSelector(selectSettings);
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const userDataObject = useAppSelector(selectUserDataAsObject);
  const [gotUserDataFromBackend, setGotUserDataFromBackend] = useState(false);

  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (isLoggedIn && !subscribed) {
      fetchAndSubscribeAllData();
      setSubscribed(true);
    }
  }, [isLoggedIn, subscribed]);

  useEffect(() => {
    if (!gotUserDataFromBackend && userDataObject !== undefined) {
      setGotUserDataFromBackend(true);
    }
  }, [userDataObject, gotUserDataFromBackend]);

  useEffect(() => {
    logger.info(`Running as ${process.env.REACT_APP_PERSONALITY_NAME}`);
    // logger.info(`Frontend version ${process.env.REACT_APP_VERSION}`)
  }, []);

  const dissectoTheme = useMemo(
    () =>
      createTheme({
        palette: {
          ...(!settings.isDarkTheme
            ? {
                // palette values for light mode
                mode: "light",
                primary: {
                  main: "#ffcd00",
                },
                divider: amber[200],
                text: {
                  primary: grey[900],
                  secondary: grey[500],
                },
              }
            : {
                // palette values for dark mode
                mode: "dark",
                primary: {
                  main: "#ffcd00",
                },
                divider: amber[200],
                background: {
                  default: grey[900],
                  paper: grey[900],
                },
                text: {
                  primary: grey[50],
                  secondary: grey[500],
                },
                action: {},
              }),
        },
        breakpoints: {
          values: {
            xs: 0,
            sm: 600,
            md: 900,
            lg: 1400,
            xl: 1536,
          },
        },
        components: {},
        typography: {
          fontFamily: [
            "-apple-system",
            "BlinkMacSystemFont",
            '"Segoe UI"',
            "Roboto",
            "Oxygen",
            "Ubuntu",
            "Cantarell",
            "Fira Sans",
            "Droid Sans",
            '"Helvetica Neue"',
            "sans-serif",
            "Share Tech Mono",
          ].join(","),
          body3: {
            fontFamily: "Share Tech Mono",
            fontWeight: 300,
          },
        },
        transitions: {
          ...(process.env.REACT_APP_PUPPETEER_TEST === "true"
            ? {
                create: () => "none",
              }
            : {}),
        },
      }),
    [settings]
  );

  return gotUserDataFromBackend ? (
    <ThemeProvider theme={dissectoTheme}>
      <CssBaseline enableColorScheme={true} />
      <div className="App">
        <UserMessage />
        <BackendEventDialog />
        <div className="Content">
          <div className="DockingArea">
            <MainLuminoWidget theme={dissectoTheme} />
          </div>
        </div>
      </div>
    </ThemeProvider>
  ) : (
    <div
      style={{ backgroundColor: "grey", width: "100%", height: "100vh" }}
    ></div>
  );
}

export default App;
