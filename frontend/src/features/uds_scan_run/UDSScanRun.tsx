import { useState, useEffect } from 'react';
import { useAppSelector } from "../../app/hooks";
import {
    selectUDSScanRuns,
} from './UDSScanRunsSlice';

import TreeItem from '@mui/lab/TreeItem';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { useTranslation } from 'react-i18next'

export const getReadableUDSEnumeratorNameFrom = (udsEnumerator: TUDSEnumerator): string => {
    switch (udsEnumerator) {
        case "UDS_CCEnumerator":
            return "CommunicationControl (0x28) Enumeration"
        case "UDS_DSCEnumerator":
            return "DiagnosticSessionControl (0x10) Enumeration"
        case "UDS_EREnumerator":
            return "ECUReset (0x11) Enumeration"
        case "UDS_IOCBIEnumerator":
            return "InputOutputControlByIdentifier (0x2F) Enumeration"
        case "UDS_RCEnumerator":
            return "RoutineControl (0x31) Enumeration"
        case "UDS_RCSelectiveEnumerator":
            return "Smart RoutineControl (0x31) Enumeration"
        case "UDS_RCStartEnumerator":
            return "RoutineControl (0x31) Enumeration - RoutineControlType 'startRoutine' only"
        case "UDS_RDBIEnumerator":
            return "ReadDataByIdentifier (0x22) Enumeration"
        case "UDS_RDBISelectiveEnumerator":
            return "Smart ReadDataByIdentifier (0x22) Enumeration"
        case "UDS_RDEnumerator":
            return "RequestDownload (0x34) Enumeration"
        case "UDS_RMBAEnumerator":
            return "Smart ReadMemoryByAddress (0x23) Enumeration"
        case "UDS_RMBARandomEnumerator":
            return "Random ReadMemoryByAddress (0x23) Enumeration"
        case "UDS_RMBASequentialEnumerator":
            return "Sequential ReadMemoryByAddress (0x23) Enumeration"
        case "UDS_RDBPIEnumerator":
            return "ReadDataByPeriodicIdentifier (0x2A) Enumeration"
        case "UDS_SA_XOR_Enumerator":
            return "SecurityAccess (0x27) Enumeration - XOR-Key probing"
        case "UDS_SAEnumerator":
            return "SecurityAccess (0x27) Enumeration"
        case "UdsSecurityAccessServerEnumerator":
            return "SecurityAccess (0x27) Enumeration - Query server for keys"
        case "UDS_ServiceEnumerator":
            return "Available Services Enumeration"
        case "UDS_TDEnumerator":
            return "TransferData (0x36) Enumeration"
        case "UDS_TPEnumerator":
            return "TesterPresent (0x3E) Enumeration"
        case "UDS_WDBISelectiveEnumerator":
            return "Smart WriteDataByIdentifier (0x2E) Enumeration"
        default:
            return udsEnumerator
    }
}

export const UDSScanRuns = () => {

    const udsScanRuns = useAppSelector(selectUDSScanRuns)

    const { t } = useTranslation()

    const udsScanRunTreeItems = udsScanRuns.map((scanRun) => {
        const treeNodeId = `UDSSCANRUN::${scanRun.id}`
        return (
            <TreeItem
                key={scanRun.id}
                nodeId={treeNodeId}
                label={scanRun.config.name}
            />
        )
    })

    return (
        <TreeItem nodeId="UDSSCANRUN" label={t("Start an UDS Scan")}>
            {udsScanRunTreeItems}
        </TreeItem>
    )
}

//
// UDS Enumerator Configuration
//

const UDSBaseEnumerator = (props: {
    config: IUDS_EnumeratorConfig
    updateConfig: (config: IUDS_EnumeratorConfig) => void
}) => {

    /*
    timeout?: number
    retry_if_none_received?: boolean
    exit_if_no_answer_received?: boolean
    exit_if_service_not_supported?: boolean
    exit_scan_on_first_negative_response?: boolean
    retry_if_busy_returncode?: boolean
    scan_range?: string
    */
    const { t } = useTranslation()

    useEffect(() => {
        // "mirror" the config back on first run
        // (init the config with default values if necessary, not pretty but this way we only need to have the default values in this component)
        props.updateConfig({...props.config,
            scan_range: props.config.scan_range ?? '',
            timeout: props.config.timeout ?? 0.1,
            retry_if_none_received: props.config.retry_if_none_received ?? false,
            exit_if_no_answer_received: props.config.exit_if_no_answer_received ?? false,
            exit_if_service_not_supported: props.config.exit_if_service_not_supported ?? false,
            exit_scan_on_first_negative_response: props.config.exit_scan_on_first_negative_response ?? false,
            retry_if_busy_returncode: props.config.retry_if_busy_returncode ?? false
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const [scanRange, setScanRange] = useState(props.config.scan_range ?? '')
    const [timeout, setTimeout] = useState((props.config.timeout ?? 0.1).toString())

    return (
        <div>
            <Tooltip title={t("List of sub-functions to be scanned") as string}>
                <TextField
                    sx={{ marginRight: 1, marginTop: 1, marginBottom: 1 }}
                    id="uds-enumerator-scan-range"
                    label={t("Scan Range")}
                    //helperText="Range of identifiers to scan"
                    value={scanRange}
                    onChange={(e) => {
                        setScanRange(e.target.value)
                        props.updateConfig( {...props.config, scan_range: e.target.value } )
                    }}
                />
            </Tooltip>

            <Tooltip title={t("Time to wait for a response after a request was sent") as string}>
                <TextField
                    sx={{ marginRight: 1, marginTop: 1, marginBottom: 1 }}
                    id="uds-enumerator-timeout"
                    label={t("Timeout")}
                    helperText={t("Seconds")}
                    value={timeout}
                    type="number"
                    onChange={(e) => {
                        setTimeout(e.target.value)
                        const floatValue = parseFloat(e.target.value)
                        if (!isNaN(floatValue)) {
                            props.updateConfig( {...props.config, timeout: floatValue} )
                        }
                    }}
                />
            </Tooltip>
        </div>
    )
}

// NOTE: same as the "UDSBaseEnumerator" but encapsulated so that its appearance matches the other "complex" config pages
const UDSEnumerator = (props: {
    config: IUDS_EnumeratorConfig
    updateConfig: (config: IUDS_EnumeratorConfig) => void
}) => {
    return (
        <Container
            sx={{ border: 0.5, borderRadius: 1, padding: 1.5 }}
        >
            <UDSBaseEnumerator
                config={ props.config as IUDS_EnumeratorConfig }
                updateConfig={ props.updateConfig as (config: IUDS_EnumeratorConfig) => void }
            />
        </Container>
    )
}


const UDSEmptyConfigEnumerator = (props: {
    config: IUDS_EnumeratorConfig
    updateConfig: (config: IUDS_EnumeratorConfig) => void
}) => {
    return (
        <div></div>
    )
}


const UDSDSCEnumerator = (props: {
    config: IUDS_DSCEnumeratorConfig
    updateConfig: (config: IUDS_DSCEnumeratorConfig) => void
}) => {

    /*
    delay_state_change?: number
    overwrite_timeout?: boolean
    */

    const { t } = useTranslation()

    useEffect(() => {
        // "mirror" the config back on first run
        // (init the config with default values if necessary, not pretty but this way we only need to have the default values in this component)
        props.updateConfig({...props.config,
            delay_state_change: props.config.delay_state_change ?? 3,
            overwrite_timeout: props.config.overwrite_timeout ?? true
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <Container
            sx={{ border: 0.5, borderRadius: 1, padding: 1.5 }}
        >
            <UDSBaseEnumerator
                config={ props.config as IUDS_EnumeratorConfig }
                updateConfig={ props.updateConfig as (config: IUDS_EnumeratorConfig) => void }
            />

            <br/>

            <Tooltip title={t("Delay for a session change") as string}>
                <TextField
                    sx={{ marginRight: 1, marginTop: 1, marginBottom: 1 }}
                    id="uds-dscenumerator-delay-state-change"
                    label={t("Session change delay")}
                    helperText={t("Seconds")}
                    value={props.config.delay_state_change ?? 3}
                    type="number"
                    onChange={(e) => props.updateConfig( {...props.config, delay_state_change: parseInt(e.target.value)} )}
                />
            </Tooltip>
        </Container>
    )
}


const UDSRCEnumerator = (props: {
    config: IUDS_RCEnumeratorConfig
    updateConfig: (config: IUDS_RCEnumeratorConfig) => void
}) => {

    /*
    type_list: Optional[List[int]]
    */

    const { t } = useTranslation()

    useEffect(() => {
        // "mirror" the config back on first run
        // (init the config with default values if necessary, not pretty but this way we only need to have the default values in this component)
        props.updateConfig({...props.config,
            type_list: props.config.type_list ?? [1, 2, 3]
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const makeTypeListStringFrom = (typeList: number[]): string => {
        return typeList.map(e => e.toString()).join(',')
    }

    const makeTypeListFrom = (typeListString: string): number[] => {
        return typeListString.split(',').map(e => parseInt(e)).filter(e => typeof e === 'number')
    }

    const [typeList, setTypeList] = useState(makeTypeListStringFrom(props.config.type_list ?? [1, 2, 3]))

    return (
        <Container
            sx={{ border: 0.5, borderRadius: 1, padding: 1.5 }}
        >
            <UDSBaseEnumerator
                config={ props.config as IUDS_EnumeratorConfig }
                updateConfig={ props.updateConfig as (config: IUDS_EnumeratorConfig) => void }
            />

            <br/>

            <Tooltip title={t("Comma separated list of RoutineControlTypes") as string}>
                <TextField
                    sx={{ marginRight: 1, marginTop: 1, marginBottom: 1 }}
                    id="uds-rc-enumerator-probe-start"
                    label={t("RoutineControlTypes List")}
                    helperText={t("1 = startRoutine, 2 = stopRoutine, 3 = requestRoutineResults")}
                    value={typeList}
                    onChange={(e) => {
                        setTypeList(e.target.value)
                        props.updateConfig( {...props.config, type_list: makeTypeListFrom(e.target.value)} )
                    }}
                />
            </Tooltip>
        </Container>
    )
}

const udsEnumerators = [
    'UDS_ServiceEnumerator',
    'UDS_DSCEnumerator',
    'UDS_RDBIEnumerator',
    'UDS_RDBISelectiveEnumerator',
    'UDS_WDBISelectiveEnumerator',
    'UDS_SAEnumerator',
    'UDS_SA_XOR_Enumerator',
    'UdsSecurityAccessServerEnumerator',
    'UDS_RCEnumerator',
    'UDS_RCStartEnumerator',
    'UDS_RCSelectiveEnumerator',
    'UDS_RMBAEnumerator',
    'UDS_RMBARandomEnumerator',
    'UDS_RMBASequentialEnumerator',
    'UDS_TPEnumerator',
    'UDS_EREnumerator',
    'UDS_IOCBIEnumerator',
    'UDS_CCEnumerator',
    'UDS_RDEnumerator',
    'UDS_TDEnumerator',
    'UDS_RDBPIEnumerator'
] as const

export type TUDSEnumerator = typeof udsEnumerators[number]

interface IUDS_EnumeratorConfig {
    timeout?: number
    retry_if_none_received?: boolean
    exit_if_no_answer_received?: boolean
    exit_if_service_not_supported?: boolean
    exit_scan_on_first_negative_response?: boolean
    retry_if_busy_returncode?: boolean
    scan_range?: string
}
interface IUDS_DSCEnumeratorConfig extends IUDS_EnumeratorConfig {
    delay_state_change?: number
    overwrite_timeout?: boolean
}
interface IUDS_TPEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_EREnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_CCEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_RDBPIEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_ServiceEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_RDBIEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_RDBISelectiveEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_WDBIEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_WDBISelectiveEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_SAEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_SA_XOR_EnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_SecurityAccessServerEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_RCEnumeratorConfig extends IUDS_EnumeratorConfig {
    type_list?: number[]
}
interface IUDS_RCStartEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_RCSelectiveEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_IOCBIEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_RMBAEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_RMBARandomEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_RMBASequentialEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_RDEnumeratorConfig extends IUDS_EnumeratorConfig {}
interface IUDS_TDEnumeratorConfig extends IUDS_EnumeratorConfig {}

interface IUDS_EnumeratorsConfig {
    UDS_DSCEnumeratorConfig?: IUDS_DSCEnumeratorConfig
    UDS_TPEnumeratorConfig?: IUDS_TPEnumeratorConfig
    UDS_EREnumeratorConfig?: IUDS_EREnumeratorConfig
    UDS_CCEnumeratorConfig?: IUDS_CCEnumeratorConfig
    UDS_RDBPIEnumeratorConfig?: IUDS_RDBPIEnumeratorConfig
    UDS_ServiceEnumeratorConfig?: IUDS_ServiceEnumeratorConfig
    UDS_RDBIEnumeratorConfig?: IUDS_RDBIEnumeratorConfig
    UDS_RDBISelectiveEnumeratorConfig?: IUDS_RDBISelectiveEnumeratorConfig
    UDS_WDBIEnumeratorConfig?: IUDS_WDBIEnumeratorConfig
    UDS_WDBISelectiveEnumeratorConfig?: IUDS_WDBISelectiveEnumeratorConfig
    UDS_SAEnumeratorConfig?: IUDS_SAEnumeratorConfig
    UDS_SA_XOR_EnumeratorConfig?: IUDS_SA_XOR_EnumeratorConfig
    UDS_SecurityAccessServerEnumeratorConfig?: IUDS_SecurityAccessServerEnumeratorConfig
    UDS_RCEnumeratorConfig?: IUDS_RCEnumeratorConfig
    UDS_RCStartEnumeratorConfig?: IUDS_RCStartEnumeratorConfig
    UDS_RCSelectiveEnumeratorConfig?: IUDS_RCSelectiveEnumeratorConfig
    UDS_IOCBIEnumeratorConfig?: IUDS_IOCBIEnumeratorConfig
    UDS_RMBAEnumeratorConfig?: IUDS_RMBAEnumeratorConfig
    UDS_RMBARandomEnumeratorConfig?: IUDS_RMBARandomEnumeratorConfig
    UDS_RMBASequentialEnumeratorConfig?: IUDS_RMBASequentialEnumeratorConfig
    UDS_RDEnumeratorConfig?: IUDS_RDEnumeratorConfig
    UDS_TDEnumeratorConfig?: IUDS_TDEnumeratorConfig
}
