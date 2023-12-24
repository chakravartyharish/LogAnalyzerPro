import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Root } from 'react-dom/client';
import { RootState, store } from '../../app/store';
import { IUDSScanRun, IUDSScanRunFinding } from '../uds_scan_run/UDSScanRunsSlice';
import i18n from 'i18next';

export type ReactWidgetComponentType = 'COUNTER' | 'HARDWAREWINTERFACECONFIG' | 'UDSSCANRUN' | 'UDSSCANREPORT' | 
                                       'ISOTPENDPOINTSCANRUN' | 'ISOTPENDPOINTSADDMANUALLY' | 'ISOTPENDPOINTCONFIG' |
                                       'GLOBALLIVEDATA' | 'MAINTREENAVIGATION' | 'TERMINAL' | 'LICENSES' | 'LICENSECONFIG' |
                                       'IMPRESSUM' | 'SETTINGS' | 'VERSIONS' | 'EXTERNALLICENSES' | 'REMOTERUNNERS' |
                                       'REMOTERUNNERCONFIG' | 'REMOTEJOBTEMPLATES' | 'REMOTEJOBTEMPLATE' | 'REMOTE' | 'REMOTEJOBS' |
                                       'GENERICREMOTEJOBRESULT' | 'USERMANAGEMENT' | 'USER' | 'TARGETECUS' | 'TARGETECUCONFIG' | 'TESTCASESEXECUTION' |
                                       'TESTCASERESULT' | 'GROUPMANAGEMENT' | 'RAWLIVEDATA' | 'HYDRACOREDOCU'

export interface IWidgetUidToCmpRootHashMap {
  [key: string]: Root
}

export interface IAppWidgetContent {
  componentType: ReactWidgetComponentType
  props: any                                // react properties for the component
}

export interface IAppWidget {
  uid: string
  name: string
  active: boolean
  content: IAppWidgetContent
}

export interface IMainLuminoWidgetState {
  widgets: IAppWidget[]
}

const initialState: IMainLuminoWidgetState = {
  widgets: []
}

export const mainLuminoWidgetSlice = createSlice({
  name: 'mainLuminoWidget',
  initialState,
  reducers: {
    activateWidget: (state: IMainLuminoWidgetState, action: PayloadAction<string>) => {
      state.widgets = state.widgets.map((widget) => {
        widget.active = (widget.uid === action.payload)
        return widget
      })
    },
    addWidget: (state: IMainLuminoWidgetState, action: PayloadAction<IAppWidget>) => {
      if (!action.payload.active) {
        // just add the new widget
        state.widgets.push(action.payload)
      } else {
        // add the new widget and set it active
        state.widgets = [...state.widgets, action.payload].map((widget) => {
          widget.active = (widget.uid === action.payload.uid)
          return widget
        })
      }
    },
    deleteWidget: (state: IMainLuminoWidgetState, action: PayloadAction<string>) => {
      state.widgets = state.widgets.filter((widget) => widget.uid !== action.payload)
    }
  },
})

export const { activateWidget, addWidget, deleteWidget } = mainLuminoWidgetSlice.actions;

export const makeWidgetUid = (componentType: ReactWidgetComponentType, componentId: number | undefined) => {
  if (componentId !== undefined) {
    return `${componentType}::${componentId}`
  } else {
    return `${componentType}`
  }
}

const addOrActivateWidget = (uid: string, name: string, componentType: ReactWidgetComponentType, properties: any = {}, addActive: boolean = true) => {
  const existingWidget = store.getState().mainLuminoWidget.widgets.filter(widget => widget.uid === uid).pop()
  if (existingWidget === undefined) {
    // create a new widget
    return addWidget({ uid: uid, name: name, content: { componentType: componentType, props: properties }, active: addActive})
  } else {
    // activate the existing widget
    return activateWidget(uid)
  }
}

export const addOrActivateTestTerminalWidget = () => {
  return addOrActivateWidget('TERMINAL', i18n.t('Test Terminal'), 'TERMINAL')
}

export const addOrActivateMainTreeNavigationWidget = () => {
  return addOrActivateWidget('MAINTREENAVIGATION', i18n.t('Main Menu'), 'MAINTREENAVIGATION')
}

export const addOrActivateISOTPEndpointAddManualWidget = () => {
  // there is only one "add an endpoint manually" widget
  return addOrActivateWidget('ISOTPENDPOINTSADDMANUALLY', i18n.t('Add an ISOTP Endpoint'), 'ISOTPENDPOINTSADDMANUALLY')
}

export const addOrActivateUDSScanRunWidget = (scanRun: IUDSScanRun | undefined = undefined) => {
  // an undefined scan run object will add / activate the "add a new scan run" widget
  const widgetUid = makeWidgetUid('UDSSCANRUN', scanRun?.id)
  const widgetName = i18n.t('UDS Scan Run') + (scanRun?.config.name === undefined ? '' : ` - ${scanRun!.config.name}`)
  return addOrActivateWidget(widgetUid, widgetName, 'UDSSCANRUN', { scanRunId: scanRun?.id })
}

export const addOrActivateGlobalLiveDataWidget = () => {
  return addOrActivateWidget('GLOBALLIVEDATA', i18n.t('Global Live Data'), 'GLOBALLIVEDATA')
}

export const addOrActivateRawLiveData = (lines: string[], title: string) => {
  const widgetUid = title
  const widgetName = `${title} - ` + i18n.t('Raw Log Data')
  return addOrActivateWidget(widgetUid, widgetName, 'RAWLIVEDATA', {lines: lines})
}

export const addOrActivateUDSScanReportWidget = (scanReport: IUDSScanRunFinding | undefined = undefined) => {
  const widgetUid = makeWidgetUid('UDSSCANREPORT', scanReport?.id)
  const widgetName = i18n.t('UDS Scan Run Report') + (scanReport?.results_file === undefined ? '' : ` - ${scanReport!.results_file}`)
  return addOrActivateWidget(widgetUid, widgetName, 'UDSSCANREPORT', {
    scanReportId: scanReport?.id,
  })
}

export const addOrActivateFakeUDSScanReportWidget = (scanReport: IUDSScanRunFinding | undefined = undefined) => {
  // NOTE: We have this "add fake scan run" to be able to explicitly create a report page without an actual report
  //       (not having this would make it impossible to auto-close the page if the report gets deleted ...)
  const widgetUid = makeWidgetUid('UDSSCANREPORT', scanReport?.id)
  const widgetName = i18n.t('UDS Scan Run Report (Fake)') + (scanReport?.results_file === undefined ? '' : ` - ${scanReport!.results_file}`)
  return addOrActivateWidget(widgetUid, widgetName, 'UDSSCANREPORT', {
    scanReportId: scanReport?.id,
    staticInjectedScanReport: scanReport
  })
}

export const addOrActivateLicensesWidget = () => {
  return addOrActivateWidget('LICENSES', i18n.t('Add a license'), 'LICENSES')
}

export const addOrActivateImpressumWidget = () => {
  return addOrActivateWidget('IMPRESSUM', i18n.t('Impressum'), 'IMPRESSUM')
}

export const addOrActivateSettingsWidget = () => {
  return addOrActivateWidget('SETTINGS', i18n.t('Settings'), 'SETTINGS')
}

export const addOrActivateVersionsWidget = () => {
  return addOrActivateWidget('VERSIONS', i18n.t('Versions'), 'VERSIONS')
}

export const addOrActivateExternalLicensesWidget = () => {
  return addOrActivateWidget('EXTERNALLICENSES', i18n.t('Open Source Licenses'), 'EXTERNALLICENSES')
}

export const addOrActivateRemoteRunnersWidget = () => {
  const widgetUid = makeWidgetUid('REMOTERUNNERS', undefined)
  return addOrActivateWidget(widgetUid, i18n.t('Probes'), 'REMOTERUNNERS')
}

export const addOrActivateTargetECUsWidget = () => {
  const widgetUid = makeWidgetUid('TARGETECUS', undefined)
  return addOrActivateWidget(widgetUid, i18n.t('Target ECUs'), 'TARGETECUS')
}

// User and groups

export const addOrActivateUserWidget = () => {
  return addOrActivateWidget('USER', i18n.t('User'), 'USER')
}

export const addOrActivateUserManagementWidget = () => {
  return addOrActivateWidget('USERMANAGEMENT', i18n.t('User Management'), 'USERMANAGEMENT')
}

export const addOrActivateGroupManagementWidget = () => {
  return addOrActivateWidget('GROUPMANAGEMENT', i18n.t('Group Management'), 'GROUPMANAGEMENT')
}

export const addOrActivateHydraCoreDocuWidget = () => {
  return addOrActivateWidget('HYDRACOREDOCU', i18n.t('HydraCore Documentation'), 'HYDRACOREDOCU')
}

export const selectAppWidgets = (state: RootState) => state.mainLuminoWidget.widgets

export default mainLuminoWidgetSlice.reducer;
