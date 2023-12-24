import React, { ReactElement, ReactNode, createContext, createRef, useContext, useEffect, useRef, useState } from "react";
import { store } from "../../app/store";

import { showUserMessage } from "../user_message/UserMessageSlice";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import DialogActions from "@mui/material/DialogActions";
import Tooltip from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { TAppEnvironment } from "../system_data/SystemDataSlice";
import { deleteWidget, IAppWidget, selectAppWidgets } from "../main_lumino_widget/MainLuminoWidgetSlice";
import { useTranslation } from "react-i18next";
import { TPersonalityName, TSortOrder, TUserDataKey } from "./GlobalTypes";
import { IconButton } from "@mui/material";
import { ListChildComponentProps, VariableSizeList } from "react-window";
import { logger } from "../../app/logging";
import Typography from "@mui/material/Typography";
import Popper from "@mui/material/Popper";
import Autocomplete, { autocompleteClasses } from "@mui/material/Autocomplete";
import Toolbar from "@mui/material/Toolbar";
import moment from "moment";
import i18n from 'i18next';
import { updateUserDataObjectAsync } from "../settings/UserDataSlice";

// FIXME: use the "real" type ...
type TMaterialButtonColor = 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'

export const DeleteElementButton = (props: {
    id?: string,
    title: string,
    message: string,
    disabled?: boolean,
    deleteCallback: () => void,
}) => {
    const hasValidLicense: boolean = true
    const { t } = useTranslation()
    return (
        <ButtonWithDialog
            id={props.id}
            title={props.title}
            message={props.message}
            disabled={props.disabled || !(hasValidLicense)}
            buttonColor="error"
            proceedButtonColor="error"
            cancelButtonColor="primary"
            proceedCallback={props.deleteCallback}
        >
            {t("Delete")}
        </ButtonWithDialog>
    )
}

export const ButtonWithImplicitLicenseCheck = (props: {
    text: string,
    sx: object,
    id?: string,
    color?: TMaterialButtonColor,
    variant: "text" | "contained" | "outlined" | undefined,
    onClickCallback: () => void,
    disabledCondition: boolean | undefined,
}) => {
    const hasValidLicense: boolean = true
    const { t } = useTranslation()
    return (
        <Tooltip title={hasValidLicense ? "" : t("This action requires a valid license.") as string}>
            <div>
                <Button
                    sx={props.sx}
                    id={props.id}
                    color={props.color}
                    variant={props.variant}
                    onClick={props.onClickCallback}
                    disabled={props.disabledCondition || !(hasValidLicense)}
                >
                    {props.text}
                </Button>
            </div>
        </Tooltip>
    )
}

export const IconButtonWithImplicitLicenseCheck = (props: {
    text?: string,
    sx?: object,
    keyProp?: string,
    id?: string | undefined,
    disableRipple?: boolean,
    size: "small" | "medium" | "large",
    tooltip?: string,
    color?: 'inherit' | 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | undefined
    icon: any,
    onClickCallback: () => void,
    disabledCondition: boolean | undefined
}) => {
    const hasValidLicense: boolean = true
    const { t } = useTranslation()
    return (
        <Tooltip title={hasValidLicense ? (props.tooltip ? props.tooltip : "") : t("This action requires a valid license.") as string}>
            <div>
                <IconButton
                    sx={props.sx}
                    key={props.keyProp}
                    id={props.id}
                    size={props.size}
                    color={props.color}
                    disableRipple={props.disableRipple}
                    onClick={props.onClickCallback}

                    disabled={props.disabledCondition || !(hasValidLicense)}
                >
                    {<props.icon size={props.size}/>}
                    <div>{props.text}</div>
                </IconButton>
            </div>
        </Tooltip>
    )
}

export const ButtonWithDialog = (props: {
    id?: string,
    title: string,
    message: string,
    disabled?: boolean,
    buttonColor?: TMaterialButtonColor,
    proceedButtonColor?: TMaterialButtonColor,
    proceedButtonText?: string,
    cancelButtonColor?: TMaterialButtonColor,
    cancelButtonText?: string
    proceedCallback: () => void,
    children?: ReactNode
}) => {

    const [showDialog, setShowDialog] = useState(false)
    const { t } = useTranslation()

    return (
        <span>
            <Button
                id={props.id}
                sx={{ margin: 1 }}
                variant="contained"
                color={props.buttonColor ?? "primary"}
                onClick={() => setShowDialog(true)}
                disabled={props.disabled}
            >
                {props.children}
            </Button>

            <Dialog
                open={showDialog}
                onClose={() => setShowDialog(false)}
                aria-labelledby="dialog-title"
                aria-describedby="dialog-description"
            >
                <DialogTitle id="dialog-title">
                    {props.title}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="dialog-description">
                        {props.message}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        id="dialog-cancel-button"
                        variant="contained"
                        color={props.cancelButtonColor ?? "primary"}
                        onClick={() => setShowDialog(false)}
                    >
                        {props.cancelButtonText ?? t("Cancel")}
                    </Button>
                    <Button
                        id="dialog-proceed-button"
                        variant="contained"
                        color={props.proceedButtonColor ?? "secondary"}
                        onClick={() => {
                            setShowDialog(false)
                            props.proceedCallback()
                        }}
                        autoFocus
                    >
                        {props.proceedButtonText ?? t("Proceed")}
                    </Button>
                </DialogActions>
            </Dialog>
        </span>
    )
}

export const IconButtonWithDialog = (props: {
    sx?: object,
    keyProp?: string,
    id?: string | undefined,
    title: string,
    message: string,
    disableRipple?: boolean,
    size: "small" | "medium" | "large",
    tooltip?: string,
    color?: 'inherit' | 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | undefined
    icon: any,
    onClickCallback: () => void,
    disabledCondition: boolean | undefined
    proceedButtonColor?: TMaterialButtonColor,
    proceedButtonText?: string,
    cancelButtonColor?: TMaterialButtonColor,
    cancelButtonText?: string

}) => {

    const [showDialog, setShowDialog] = useState(false)
    const { t } = useTranslation()

    return (
        <span>
            <IconButton
                sx={props.sx}
                key={props.keyProp}
                id={props.id}
                size={props.size}
                color={props.color}
                disableRipple={props.disableRipple}
                onClick={() => setShowDialog(true)}

                disabled={props.disabledCondition}
            >
                {<props.icon size={props.size}/>}
            </IconButton>

            <Dialog
                open={showDialog}
                onClose={() => setShowDialog(false)}
                aria-labelledby="dialog-title"
                aria-describedby="dialog-description"
            >
                <DialogTitle id="dialog-title">
                    {props.title}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="dialog-description">
                        {props.message}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        id="dialog-cancel-button"
                        variant="contained"
                        color={props.cancelButtonColor ?? "primary"}
                        onClick={() => setShowDialog(false)}
                    >
                        {props.cancelButtonText ?? t("Cancel")}
                    </Button>
                    <Button
                        id="dialog-proceed-button"
                        variant="contained"
                        color={props.proceedButtonColor ?? "secondary"}
                        onClick={() => {
                            setShowDialog(false)
                            props.onClickCallback()
                        }}
                        autoFocus
                    >
                        {props.proceedButtonText ?? t("Proceed")}
                    </Button>
                </DialogActions>
            </Dialog>
        </span>
    )
}

export const AutoTooltip = (props: any) => {
    const textDivRef = useRef<HTMLDivElement>(null)
    const [showTooltip, setShowTooltip] = useState(false) 

    useEffect(() => {
        setShowTooltip((textDivRef.current?.scrollWidth ?? 0) > (textDivRef.current?.clientWidth ?? 0))
    }, [textDivRef])

    return (
        <Tooltip
            title={props.children}
            disableHoverListener={!showTooltip}
        >
            <div
                ref={textDivRef}
                style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
                {props.children}
            </div>
        </Tooltip>
    )
}

export const showNeedsProfessionalVersionMessage = (specificMessage: string) => {
    store.dispatch(showUserMessage({ title: i18n.t("Professional Version Feature"), message: specificMessage}))
}

export const showMaxRemoteRunnerLimitExceededLicenseMessage = (maxRemoteRunners: number) => {
    showNeedsProfessionalVersionMessage(`${i18n.t("The current maximum amount of probes is set to ")}${maxRemoteRunners}. ${i18n.t("You can buy a professional license to increase it.")}`)
}

export const showUseAtYourOwnRiskDisclaimer = () => {
    store.dispatch(showUserMessage({ title: i18n.t("Disclaimer"),
                                     message: i18n.t("WARNING! - YOUR USE OF THIS SOFTWARE MUST BE DONE WITH CAUTION AND A FULL UNDERSTANDING OF THE RISKS!\n") +
                                              i18n.t("THIS WARNING IS PRESENTED TO INFORM YOU THAT THE OPERATION OF THIS SOFTWARE MAY\n") +
                                              i18n.t("BE DANGEROUS. YOUR ACTIONS CAN INFLUENCE THE BEHAVIOR OF AN ELECTRONIC CONTROL\n") +
                                              i18n.t("SYSTEM, AND DEPENDING ON THE APPLICATION, THE CONSEQUENCES OF YOUR IMPROPER\n") +
                                              i18n.t("ACTIONS COULD CAUSE SERIOUS OPERATIONAL MALFUNCTION, DAMAGE TO EQUIPMENT, AND\n") +
                                              i18n.t("PHYSICAL INJURY TO YOURSELF AND OTHERS.")}))
}

export const LicenseNeededTextField = styled(TextField)({
    '& .MuiInputBase-root.Mui-disabled': {
      backgroundColor: "#ffcd00",
    },
  })

export const getLicenseServerAPIBaseURL = (app_environment: TAppEnvironment): string => {
    switch (app_environment) {
        case "development":
            return "http://localhost:9000/api/issue_free_license/"
        case "test":
            // not sure about this one
            return "http://localhost:9000/api/issue_free_license/"
        case "production":
            return "https://license.dissec.to/api/issue_free_license/"
    }
}

export const getLicenseDetailsAPIURL = (app_environment: TAppEnvironment): string => {
    switch (app_environment) {
        case "development":
            return "http://localhost:9000/api/license_info/"
        case "test":
            // not sure about this one
            return "http://localhost:9000/api/license_info/"
        case "production":
            return "https://license.dissec.to/api/license_info/"
    }
}

export const isValidEmail = (email: string): boolean => {
    //console.time(`@@@ check mail ${email.length}`)
    // NOTE: the javas... regex backtracking would go crazy here without the "possessive quantifier"
    //       for the optional name parts bevore the "@" (take several seconds for a innocent looking email)
    //       unfortunately the javas... regex engine does not support this feature and so we have to "emulate" it
    //let res = /^\w+(?:[.-]?\w+)*@\w+(?:[.-]?\w+)*(?:\.\w+)+$/.test(email)
    let res = /^(?=(\w+))\1(?:[.-]?(?=(\w+))\2)*@(?=(\w+))\3(?:[.-]?(?=(\w+))\4)*(?:\.\w+)+$/.test(email)
    //console.timeEnd(`@@@ check mail ${email.length}`)
    return res
}

export const isValidURL = (url: string): boolean => {
    try {
        new URL(url)
        return true
    } catch (err) {
        return false
    }
}

// Distinct array values
export const distinct = (value: any, index: any, self: string | any[]) => {
    return self.indexOf(value) === index
}

export const useObserveAndDeleteWidget = (prefix: string, stateValues: any[]) => {
    /**
     * Observes stateValues with useEffect and deletes widgets whose ids are 
     * not present in stateValues anymore.
     */
    const appWidgets: IAppWidget[] = useAppSelector(selectAppWidgets)
    const dispatch = useAppDispatch()
    useEffect(() => {
        const shownIds: string[] = compactMap(appWidgets, widget => {
            const parts = widget.uid.split('::')
            // NOTE: right now only uids with this format are expected A::ID
            // Special handling for widgets with more than two parts has 
            // to be added here if necessary    
            if (parts[0] === prefix && parts.length === 2) {
                return parts[1]
            }
        })
        // FIXME
        // Note: all views should have the id attribute as the unique identifier. Only the REMOTEJOBS
        // are a special case, because their view is dependent on the tag attribute of the remote jobs
        const availableIds: string[] = stateValues.map(stateValue => ['REMOTEJOBS'].indexOf(prefix) !== -1 ? `${stateValue.tag}` : `${stateValue.id}`)
        // Note: -1 values for ID are ignored. They are "created" by the system and should not be deleted
        const deletedIds = shownIds.filter(shownId => !availableIds.includes(shownId)).filter(id => id !== "-1")
        deletedIds.forEach(id => dispatch(deleteWidget(`${prefix}::${id}`)))
    }, [prefix, stateValues, appWidgets, dispatch])
}

export const showRemoteScanFailurePopup = () => {
    store.dispatch(showUserMessage({ title: i18n.t('Probe Scan failed'), 
    message: i18n.t("The scan on the probe failed. ") +
             i18n.t("Please check if the selected channel is available on the probe.")}))
}

export interface IStringMapping {
    [key: string] : string
}

export interface IStringToNumberMapping {
    [key: string] : number
}

const dec2hex = (dec: number) => {
    return dec.toString(16).padStart(2, "0")
}
  
export const generateId = (len: number) => {
    var arr = new Uint8Array((len || 40) / 2)
    window.crypto.getRandomValues(arr)
    return Array.from(arr, dec2hex).join('')
}

export const utcToLocalDateTime = (dateTimeString: string | null | undefined): Date | null => {
    if (dateTimeString === null || dateTimeString === undefined) {
        return null
    }
    // Note: we get a UTC date time string from the backend
    try {
        const [date, time] = dateTimeString!.split(".")[0].split("T")
        const [year, month, day] = date.split("-")
        const [hour, minute, second] = time.split(":")
        const localDate = new Date()
        localDate.setUTCFullYear(parseInt(year))
        localDate.setUTCMonth(parseInt(month) - 1) // month is the only attribute which starts at 0
        localDate.setUTCDate(parseInt(day))
        localDate.setUTCHours(parseInt(hour))
        localDate.setUTCMinutes(parseInt(minute))
        localDate.setUTCSeconds(parseInt(second))
        return localDate
    } catch(error) {
        logger.error(error)
        return null
    }
}

export const utcToLocalDateTimeRepresentation = (dateTimeString: string | null | undefined): string | null => {
    const localDate = utcToLocalDateTime(dateTimeString)
    if (localDate === null) {
        return null
    }
    return `${localDate.toLocaleDateString()} ${localDate.toLocaleTimeString()}`
}

export const getRemoteJobStateMappedToRepresentation = (state: string) => {
    const remoteJobStateToRepresentationMapping: IStringMapping = {
        "CREATED_WAITING": i18n.t("Job was created and is currently queued"),
        "CREATED": i18n.t("Job was created and should run as soon as possible"),
        "WAITING_FOR_ARCHIVE_DOWNLOAD": i18n.t("Job waits for the archive download to finish"),
        "RUNNING": i18n.t("Job is running"),
        "WAITING_FOR_ARTIFACT_UPLOAD": i18n.t("Job waits for the artifact upload to finish"),
        "FINISHED_SUCCESS": i18n.t("Job successfully finished"),
        "FINISHED_ERROR": i18n.t("Job finished with an error")
    }
    return remoteJobStateToRepresentationMapping[state] ? remoteJobStateToRepresentationMapping[state] : state
}

export const encodeBase64 = (str: string): string => {
    return Buffer.from(str).toString('base64')
}

export const decodeBase64 = (b64str: string): string => {
    return Buffer.from(b64str, 'base64').toString('utf8')
}

export const authenticatedFetch = (url: string, method: string, headers?: Headers, body?: BodyInit) => {
        let fetchOptions
            fetchOptions = { method: method,
                             headers: {},
                             body: body }
       if (headers) {
            let currentHeaders = fetchOptions.headers
            fetchOptions.headers = {...headers, ...currentHeaders}
        }

        return fetch(url, fetchOptions)
}

export const isValidJSONString = (jsonString: string): boolean => {
    try {
        JSON.parse(jsonString)
        return true
    } catch {
        return false
    }
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
        return -1
    }
    if (b[orderBy] > a[orderBy]) {
        return 1
    }
    return 0
}

export function getSortComparator<Key extends keyof any>(order: TSortOrder, orderBy: Key): (a: { [key in Key]?: any },
                                                                                            b: { [key in Key]?: any }) => number {
    return order === "desc"
        ? (a, b) => +descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy)
}

//
// virtual list box (elements rendered "on demand")
//

const VIRTUAL_LIST_BOX_PADDING = 8
const renderVirtualListBoxRow = (props: ListChildComponentProps) => {
    const { data, index, style } = props;
    const reactChild = data[index]
    const inlineStyle = {
        ...style,
        top: (style.top as number) + VIRTUAL_LIST_BOX_PADDING,
    }

    return (
        <Typography component="li" {...reactChild.props} style={inlineStyle} noWrap>
            {reactChild.key}
        </Typography>
    )
}
const VirtualListBoxOuterElementContext = createContext({})
const VirtualListBoxOuterElementType = React.forwardRef<HTMLDivElement>((props, ref) => {
    const outerProps = useContext(VirtualListBoxOuterElementContext)
    return (
        <div ref={ref} {...props} {...outerProps} />
    )
})
export const VirtualListBoxComponent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLElement>>((props, ref) => {
    const { children, ...other } = props
    const itemData: ReactElement[] = [];
    (children as ReactElement[]).forEach((item: ReactElement) => itemData.push(item) )

    const maxItemsPerPage = 8
    const itemSize = 36
    const itemCount = itemData.length

    return (
        <div ref={ref}>
            <VirtualListBoxOuterElementContext.Provider value={other}>
                <VariableSizeList
                    width="100%"
                    height={(Math.min(itemCount, maxItemsPerPage) * itemSize) + (2 * VIRTUAL_LIST_BOX_PADDING)}
                    itemData={itemData}
                    itemCount={itemCount}
                    itemSize={(_) => itemSize}
                    innerElementType="ul"
                    outerElementType={VirtualListBoxOuterElementType}
                    overscanCount={2}
                >
                    {renderVirtualListBoxRow}
                </VariableSizeList>
            </VirtualListBoxOuterElementContext.Provider>
        </div>
    )
})
export const VirtualListBoxStyledPopper = styled(Popper)({
    [`& .${autocompleteClasses.listbox}`]: {
        boxSizing: 'border-box',
        '& ul': {
            padding: 0,
            margin: 0,
        },
    },
})

//
// Table toolbar with simple string filter textbox
//

export interface ITableToolbarWithFilterInputProps {
    toolbarTitle: string
    filterTextBoxLabel: string
    filterPattern: string
    setFilterPattern: (filter: string) => void
    getSuggestedFilterItems: (currentFilterString: string) => string[]
    hasValidFilter: boolean
}
export const TableToolbarWithFilterInput = (props: ITableToolbarWithFilterInputProps) => {

    const [localFilterPattern, setLocalFilterPattern] = useState(props.filterPattern)
    const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | undefined>(undefined)
    const inputRef = createRef<HTMLInputElement>()

    useEffect(() => {
        setLocalFilterPattern(props.filterPattern)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.filterPattern])

    useEffect(() => {
        if (timer !== undefined) {
            clearTimeout(timer)
        }
        setTimer(setTimeout(() => {
            props.setFilterPattern(localFilterPattern)
        }, 500))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localFilterPattern])

    return (
        <Toolbar
            id={props.toolbarTitle}
            sx={{
                pl: {sm: 2},
                pr: {xs: 1, sm: 1}
            }}
        >
            <Typography
                sx={{flex: "1 1 100%"}}
                variant="h6"
                id="tableTitle"
            >
                {props.toolbarTitle}
            </Typography>
            <Autocomplete
                sx={{ marginLeft: 1 }}
                id={`tableFilter-${props.toolbarTitle}`}
                PopperComponent={VirtualListBoxStyledPopper}
                fullWidth
                disablePortal
                value={localFilterPattern}
                onInputChange={(event, _) => {
                    event?.preventDefault()
                    event?.stopPropagation()
                }}
                ListboxComponent={VirtualListBoxComponent}
                inputValue={localFilterPattern}
                onChange={(_, newInputValue) => {
                    if (newInputValue === null) {
                        // clear listbox button
                        setLocalFilterPattern("")
                        return
                    }
                    setLocalFilterPattern(newInputValue)
                }}
                freeSolo={true}
                style={{ width: 1000 }}
                renderInput={(params) => {
                    return (
                        <TextField
                            className="autoTextField"
                            {...params}
                            variant="outlined"
                            label={props.filterTextBoxLabel}
                            inputRef={inputRef}
                            color={ localFilterPattern === props.filterPattern ? (props.hasValidFilter ? "success" : "error") : "warning" }
                            onChange={(e: any) => { setLocalFilterPattern(e.target.value) }}
                            value={localFilterPattern}
                        />
                    )
                }}
                filterOptions={(x) => x}
                options={props.getSuggestedFilterItems(localFilterPattern)}
            />
        </Toolbar>
    )
}

export function compactMap<T, R>(array: T[], mapper: (element: T) => R | null | undefined): R[] {
    return array.map(mapper).filter((e) => e !== null && e !== undefined) as R[]
}

export const unixTimestampToDateTimeString = (timeStamp: number, formatString: string = "YYYY-MM-DD HH:mm:ss,SSS"): string => {
    return moment.unix(timeStamp).format(formatString)
}

export const unixTimestampToDateObject = (timeStamp: number): Date => {
    return moment.unix(timeStamp).toDate()
}

export const dateTimeStringToDateObject = (dateTimeString: string, formatString: string = "YYYY-MM-DD HH:mm:ss,SSS"): Date => {
    return moment(dateTimeString, formatString).toDate()
}

export const dateTimeObjectToDateTimeString = (dateTimeObject: Date, formatString: string = "YYYY-MM-DD HH:mm:ss,SSS"): string => {
    return moment(dateTimeObject).format(formatString)
}

export const keyStringToLabel = (keyString: string): string => {
    // some_key-string => Some Key String
    return keyString.replace(/[^a-z0-9]/gi, " ")
                    .replace(/\s+/g, " ")
                    .toLowerCase()
                    .split(" ")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")
}

export function getNodeWidth(node: HTMLElement) {
    const nodeStyles = window.getComputedStyle(node)
    const width = node.offsetWidth
    const borderLeftWidth = parseFloat(nodeStyles.borderLeftWidth!)
    const borderRightWidth = parseFloat(nodeStyles.borderRightWidth!)
    const paddingLeft = parseFloat(nodeStyles.paddingLeft!)
    const paddingRight = parseFloat(nodeStyles.paddingRight!)
    return width - borderRightWidth - borderLeftWidth - paddingLeft - paddingRight
}

export function getNodeHeight(node: HTMLElement) {
    const nodeStyles = window.getComputedStyle(node)
    const height = node.offsetHeight
    const paddingTop = parseFloat(nodeStyles.paddingTop!)
    const paddingBottom = parseFloat(nodeStyles.paddingBottom!)
    return height - paddingTop - paddingBottom
}

export const ScaledToFit = (props: any) => {

    const spanRef = React.createRef<HTMLSpanElement>()
    const [scaleString, setScaleString] = useState('scale(1.0, 1.0)')

    // eslint-disable-next-line
    useEffect(() => {
        const currentRef = spanRef.current
        if (currentRef === null) {
            return
        }
        const parentWidth = getNodeWidth(currentRef.parentElement!)
        const spanWidth = getNodeWidth(currentRef)
        const parentHeight = getNodeHeight(currentRef.parentElement!)
        const spanHeight = getNodeHeight(currentRef)
        const scale = Math.min(parentHeight / spanHeight, parentWidth / spanWidth)
        setScaleString(`scale(${scale}, ${scale})`)
    })

    return (
        <span ref={spanRef} style={{...props.style, ...{
            display: 'inline-block',
            overflowWrap: 'anywhere',
            msTransformOrigin: '0 0',
            WebkitTransformOrigin: '0 0',
            OTransformOrigin: '0 0',
            MozTransformOrigin: '0 0',
            transformOrigin: '0 0',
            msTransform: scaleString,
            WebkitTransform: scaleString,
            OTransform: scaleString,
            MozTransform: scaleString,
            transform: scaleString,
        }}}>
            {props.children}
        </span>
    )
}

export const makeRGBAColorList = (opacity: number, startIndex: number = 0, increment: number = 1, count: number = 50): string[] => {
    // from https://xkcd.com/color/rgb/
    const colors = ['172,194,217', '86,174,87', '178,153,110', '168,255,4', '105,216,79', '137,69,133', '112,178,63', '212,255,255', '101,171,124', '149,46,143', '252,252,129', '165,163,145', '56,128,4', '76,144,133', '94,155,138', '239,180,53', '217,155,130', '10,95,56', '12,6,247', '97,222,42', '55,120,191', '34,66,199', '83,60,198', '155,181,60', '5,255,166', '31,99,87', '1,115,116', '12,181,119', '255,7,137', '175,168,139', '8,120,127', '221,133,215', '166,200,117', '167,255,181', '194,183,9', '231,142,165', '150,110,189', '204,173,96', '172,134,168', '148,126,148', '152,63,178', '255,99,233', '178,251,165', '99,179,101', '142,229,63', '183,225,161', '255,111,82', '189,248,163', '211,182,131', '255,252,196', '67,5,65', '255,178,208', '153,117,112', '173,144,13', '196,142,253', '80,123,156', '125,113,3', '255,253,120', '218,70,125', '65,2,0', '201,209,121', '255,250,134', '86,132,174', '107,124,133', '111,108,10', '126,64,113', '0,147,55', '208,228,41', '255,249,23', '29,93,236', '5,73,7', '181,206,8', '143,182,123', '200,255,176', '253,222,108', '255,223,34', '169,190,112', '104,50,227', '253,177,71', '199,172,125', '255,243,154', '133,14,4', '239,192,254', '64,253,20', '182,196,6', '157,255,0', '60,65,66', '242,171,21', '172,79,6', '196,254,130', '44,250,31', '154,98,0', '202,155,247', '135,95,66', '58,46,254', '253,141,73', '139,49,3', '203,165,96', '105,131,57', '12,220,115', '183,82,3', '127,143,78', '38,83,141', '99,169,80', '200,127,137', '177,252,153', '255,154,138', '246,104,142', '118,253,168', '83,254,92', '78,253,84', '160,254,191', '123,242,218', '188,245,166', '202,107,2', '16,122,176', '33,56,171', '113,159,145', '253,185,21', '254,252,175', '252,246,121', '29,2,0', '203,104,67', '49,102,138', '36,122,253', '255,255,182', '144,253,169', '134,161,125', '253,220,92', '120,209,182', '19,187,175', '251,95,252', '32,249,134', '255,227,110', '157,7,89', '58,24,177', '194,255,137', '215,103,173', '114,0,88', '255,218,3', '1,192,141', '172,116,52', '1,70,0', '153,0,250', '2,6,111', '142,118,24', '209,118,143', '150,180,3', '253,255,99', '149,163,166', '127,104,78', '117,25,115', '8,148,4', '255,97,99', '89,133,86', '33,71,97', '60,115,168', '186,158,136', '2,27,249', '115,74,101', '35,196,139', '143,174,34', '230,242,162', '75,87,219', '217,1,102', '1,84,130', '157,2,22', '114,143,2', '255,229,173', '78,5,80', '249,188,8', '255,7,58', '199,121,134', '214,255,254', '254,75,3', '253,89,86', '252,225,102', '178,113,61', '31,59,77', '105,157,76', '86,252,162', '251,85,129', '62,130,252', '160,191,22', '214,255,250', '79,115,142', '255,177,154', '92,139,21', '84,172,104', '137,160,176', '126,160,122', '27,252,6', '202,255,251', '182,255,187', '167,94,9', '21,46,255', '141,94,183', '95,158,143', '99,247,180', '96,102,2', '252,134,170', '140,0,52', '117,128,0', '171,126,76', '3,7,100', '254,134,164', '213,23,78', '254,208,252', '104,0,24', '254,223,8', '254,66,15', '111,124,0', '202,1,71', '27,36,49', '0,251,176', '219,88,86', '221,214,24', '65,253,254', '207,82,78', '33,195,111', '169,3,8', '110,16,5', '254,130,140', '75,97,19', '77,164,9', '190,174,138', '3,57,248', '168,143,89', '93,33,208', '254,178,9', '78,81,139', '150,78,2', '133,163,178', '255,105,175', '195,251,244', '42,254,183', '0,95,106', '12,23,147', '255,255,129', '240,131,58', '241,243,63', '177,210,123', '252,130,74', '113,170,52', '183,201,226', '75,1,1', '165,82,230', '175,47,13', '139,136,248', '154,247,100', '166,251,178', '255,197,18', '117,8,81', '193,74,9', '254,47,74', '2,3,226', '10,67,122', '165,0,85', '174,139,12', '253,121,143', '191,172,5', '62,175,118', '199,71,103', '185,72,78', '100,125,142', '191,254,40', '215,37,222', '178,151,5', '103,58,63', '168,125,194', '250,254,75', '192,2,47', '14,135,204', '141,132,104', '173,3,222', '140,255,158', '148,172,2', '196,255,247', '253,238,115', '51,184,100', '255,249,208', '117,141,163', '245,4,201', '119,161,181', '135,86,228', '136,151,23', '194,126,121', '1,115,113', '159,131,3', '247,213,96', '189,246,254', '117,184,79', '156,187,4', '41,70,91', '105,96,6', '173,248,2', '193,198,252', '53,173,107', '255,253,55', '164,66,160', '243,97,150', '148,119,6', '255,244,242', '30,145,103', '181,195,6', '254,255,127', '207,253,188', '10,221,8', '135,253,5', '30,248,118', '123,253,199', '188,236,172', '187,249,15', '171,144,4', '31,181,122', '0,85,90', '164,132,172', '196,85,8', '63,130,157', '84,141,68', '201,94,251', '58,229,127', '1,103,149', '135,169,34', '240,148,77', '93,20,81', '37,255,41', '208,254,29', '255,166,43', '1,180,76', '255,108,181', '107,66,71', '199,193,12', '183,255,250', '174,255,110', '236,45,1', '118,255,123', '115,0,57', '4,3,72', '223,78,200', '110,203,60', '143,152,5', '94,220,31', '217,79,245', '200,253,61', '7,13,13', '73,132,184', '81,183,59', '172,126,4', '78,84,129', '135,110,75', '88,188,8', '47,239,16', '45,254,84', '10,255,2', '156,239,67', '24,209,123', '53,83,10', '24,5,219', '98,88,196', '255,150,79', '255,171,15', '143,140,231', '36,188,168', '63,1,44', '203,248,95', '255,114,76', '40,1,55', '179,111,246', '72,192,114', '188,203,122', '168,65,91', '6,177,196', '205,117,132', '241,218,122', '255,4,144', '128,91,135', '80,167,71', '168,164,149', '207,255,4', '255,255,126', '255,127,167', '239,64,38', '60,153,146', '136,104,6', '4,244,137', '254,246,158', '207,175,123', '59,113,159', '253,193,197', '32,192,115', '155,95,192', '15,155,142', '116,40,2', '157,185,44', '164,191,32', '205,89,9', '173,165,135', '190,1,60', '184,255,235', '220,77,1', '162,101,62', '99,139,39', '65,156,3', '177,255,101', '157,188,212', '253,253,254', '119,171,86', '70,65,150', '153,1,71', '190,253,115', '50,191,132', '175,111,9', '160,2,92', '255,216,177', '127,78,30', '191,155,12', '107,163,83', '240,117,230', '123,200,246', '71,95,148', '245,191,3', '255,254,182', '255,253,116', '137,91,123', '67,107,173', '208,193,1', '198,248,8', '244,54,5', '2,193,77', '178,95,3', '42,126,25', '73,6,72', '83,98,103', '90,6,239', '207,2,52', '196,166,97', '151,138,132', '31,9,84', '3,1,45', '43,177,121', '195,144,155', '166,111,181', '119,0,1', '146,43,5', '125,127,124', '153,15,75', '143,115,3', '200,60,185', '254,169,147', '172,187,13', '192,113,254', '204,253,127', '0,2,46', '130,131,68', '255,197,203', '171,18,57', '176,5,75', '153,204,4', '147,124,0', '1,149,41', '239,29,231', '0,4,53', '66,179,149', '157,87,131', '200,172,169', '200,118,6', '170,39,4', '228,203,255', '250,66,36', '8,4,249', '92,178,0', '118,66,78', '108,122,14', '251,221,126', '42,1,52', '4,74,5', '253,70,89', '13,117,248', '254,0,2', '203,157,6', '251,125,7', '185,204,129', '237,200,255', '97,225,96', '138,184,254', '146,10,78', '254,2,162', '154,48,1', '101,254,8', '190,253,183', '177,114,97', '136,95,1', '2,204,254', '193,253,149', '131,101,57', '251,41,67', '132,183,1', '182,99,37', '127,81,18', '95,160,82', '109,237,253', '11,249,234', '199,96,255', '255,255,203', '246,206,252', '21,80,132', '245,5,79', '100,84,3', '122,89,1', '168,181,4', '61,153,115', '0,1,51', '118,169,115', '46,90,136', '11,247,125', '189,108,72', '172,29,184', '43,175,106', '38,247,253', '174,253,108', '155,143,85', '255,173,1', '198,156,4', '244,208,84', '222,157,172', '5,72,13', '201,174,116', '96,70,15', '152,246,176', '138,241,254', '46,232,187', '17,135,93', '253,176,192', '177,96,2', '247,2,42', '213,171,9', '134,119,95', '198,159,89', '122,104,127', '4,46,96', '200,141,148', '165,251,213', '255,254,113', '98,65,199', '255,254,64', '211,73,78', '152,94,43', '166,129,76', '255,8,232', '157,118,81', '254,255,202', '152,86,141', '158,0,58', '40,124,55', '185,105,2', '186,104,115', '255,120,85', '148,178,28', '197,201,199', '102,26,238', '97,64,239', '155,229,170', '123,88,4', '39,106,179', '254,179,8', '140,253,126', '100,136,234', '5,110,238', '178,122,1', '15,254,249', '250,42,85', '130,7,71', '122,106,79', '244,50,12', '161,57,5', '111,130,138', '165,90,244', '173,10,253', '0,69,119', '101,141,109', '202,123,128', '0,82,73', '43,93,52', '191,241,40', '181,148,16', '41,118,187', '1,65,130', '187,63,63', '252,38,71', '168,121,0', '130,203,178', '102,124,62', '254,70,165', '254,131,204', '148,166,23', '168,137,5', '127,95,0', '158,67,162', '6,46,3', '138,110,69', '204,122,139', '158,1,104', '253,255,56', '192,250,139', '238,220,91', '126,189,1', '59,91,146', '1,136,159', '61,122,253', '95,52,231', '109,90,207', '116,133,0', '112,108,17', '60,0,8', '203,0,245', '0,45,4', '101,140,187', '116,149,81', '185,255,102', '157,193,0', '250,238,102', '126,251,179', '123,0,44', '194,146,161', '1,123,146', '252,192,6', '101,116,50', '216,134,59', '115,133,149', '170,35,255', '8,255,8', '155,122,1', '242,158,142', '111,194,118', '255,91,0', '253,255,82', '134,111,133', '143,254,9', '238,207,254', '81,10,201', '79,145,83', '159,35,5', '114,134,57', '222,12,98', '145,110,153', '255,177,109', '60,77,3', '127,112,83', '119,146,111', '1,15,204', '206,174,250', '143,153,251', '198,252,255', '85,57,204', '84,78,3', '1,122,121', '1,249,198', '201,176,3', '146,153,1', '11,85,9', '160,4,152', '32,0,177', '148,86,140', '194,190,14', '116,139,151', '102,95,209', '156,109,165', '196,66,64', '162,72,87', '130,95,135', '201,100,59', '144,177,52', '1,56,106', '37,163,111', '89,101,109', '117,253,99', '33,252,13', '90,134,173', '254,198,21', '255,253,1', '223,197,254', '178,100,0', '127,94,0', '222,126,93', '4,130,67', '255,255,212', '59,99,140', '183,148,0', '132,89,126', '65,25,0', '123,3,35', '4,217,255', '102,126,44', '251,238,172', '215,255,254', '78,116,150', '135,76,98', '213,255,255', '130,109,140', '255,186,205', '209,255,189', '68,142,228', '5,71,42', '213,134,157', '61,7,52', '74,1,0', '248,72,28', '2,89,15', '137,162,3', '224,63,216', '213,138,148', '123,178,116', '82,101,37', '201,76,190', '219,75,218', '158,54,35', '181,72,93', '115,92,18', '156,109,87', '2,143,30', '177,145,110', '73,117,156', '160,69,14', '57,173,72', '182,106,80', '140,255,219', '164,190,92', '203,119,35', '5,105,107', '206,93,174', '200,90,83', '150,174,141', '31,167,116', '122,151,3', '172,147,98', '1,160,73', '217,84,77', '250,95,247', '130,202,252', '172,255,252', '252,176,1', '145,9,81', '254,44,84', '200,117,196', '205,197,10', '253,65,30', '154,2,0', '190,100,0', '3,10,167', '254,1,154', '247,135,154', '136,113,145', '176,1,73', '18,225,147', '254,123,124', '255,148,8', '106,110,9', '139,46,22', '105,97,18', '225,119,1', '10,72,30', '52,56,55', '255,183,206', '106,121,247', '93,6,233', '61,28,2', '130,166,125', '190,1,25', '201,255,39', '55,62,2', '169,86,30', '202,160,255', '202,102,65', '2,216,233', '136,179,120', '152,0,2', '203,1,98', '92,172,45', '118,153,88', '162,191,254', '16,166,116', '6,180,139', '175,136,74', '11,139,135', '255,167,86', '162,164,21', '21,68,6', '133,103,152', '52,1,63', '99,45,233', '10,136,138', '111,118,50', '212,106,126', '30,72,143', '188,19,254', '126,244,204', '118,205,38', '116,166,98', '128,1,63', '177,209,252', '255,255,228', '6,82,255', '4,92,90', '87,41,206', '6,154,243', '255,0,13', '241,12,69', '81,112,215', '172,191,105', '108,52,97', '94,129,157', '96,30,249', '176,221,22', '205,253,2', '44,111,187', '192,115,122', '214,180,252', '2,0,53', '112,59,231', '253,60,6', '150,0,86', '64,163,104', '3,113,156', '252,90,80', '255,255,194', '127,43,10', '176,78,15', '160,54,35', '135,174,115', '120,155,115', '255,255,255', '152,239,249', '101,139,56', '90,125,154', '56,8,53', '255,254,122', '92,169,4', '216,220,214', '165,165,2', '214,72,215', '4,116,149', '183,144,212', '91,124,153', '96,124,142', '11,64,8', '237,13,217', '140,0,15', '255,255,132', '191,144,5', '210,189,10', '255,71,76', '4,133,209', '255,207,220', '4,2,115', '168,60,9', '144,228,193', '81,101,114', '250,194,5', '213,182,10', '54,55,55', '75,93,22', '107,139,164', '128,249,173', '165,126,82', '169,249,113', '198,81,2', '226,202,118', '176,255,157', '159,254,176', '253,170,72', '254,1,177', '193,248,10', '54,1,63', '52,28,2', '185,162,129', '142,171,18', '154,174,7', '2,171,46', '122,249,171', '19,126,109', '170,166,98', '97,0,35', '1,77,78', '143,20,2', '75,0,110', '88,15,65', '143,255,159', '219,180,12', '162,207,254', '192,251,45', '190,3,253', '132,0,0', '208,254,254', '63,155,11', '1,21,62', '4,216,178', '192,78,1', '12,255,12', '1,101,252', '207,98,117', '255,209,223', '206,179,1', '56,2,130', '170,255,50', '83,252,161', '142,130,254', '203,65,107', '103,122,4', '255,176,124', '199,253,181', '173,129,80', '255,2,141', '0,0,0', '206,162,253', '0,17,70', '5,4,170', '230,218,166', '255,121,108', '110,117,14', '101,0,33', '1,255,7', '53,6,62', '174,113,129', '6,71,12', '19,234,201', '0,255,255', '209,178,111', '0,3,91', '199,159,239', '6,194,172', '3,53,0', '154,14,234', '191,119,246', '137,254,5', '146,149,145', '117,187,253', '255,255,20', '194,0,120', '150,249,123', '249,115,6', '2,147,134', '149,208,252', '229,0,0', '101,55,0', '255,129,192', '3,67,223', '21,176,26', '126,30,156']
    let pickedColors = []
    for (let i = startIndex; pickedColors.length < count; i += Math.max(1, increment)) {
        pickedColors.push(`rgba(${colors[i % colors.length]},${opacity})`)
    }
    return pickedColors
}

export const isRunningAs = (personalityName: TPersonalityName): boolean => process.env.REACT_APP_PERSONALITY_NAME === personalityName

export const ConditionalFragment = (props: {condition: boolean, children: any}) => {
    if (props.condition) {
        return <>{props.children}</>
    } else {
        return <></>
    }
}

export const getUserDataEntryFor = (key: TUserDataKey, userDataObject: any, defaultValue: any = undefined): any => {
    return userDataObject[key] ?? defaultValue
}

export const setUserDataEntryFor = (key: TUserDataKey, value: any, userDataObject: any) => {
    let updatedUserDataObject = Object.assign({}, userDataObject)
    updatedUserDataObject[key] = value
    store.dispatch(updateUserDataObjectAsync(updatedUserDataObject))
}

export const getDateTimeStringFromUnixTimestampWithMilliseconds = (timeStamp: number): string => {
    return moment(timeStamp * 1000).format("YYYY-MM-DD HH:mm:ss,SSS")
}

export const getDateTimeStringFromRFC3339TimestampWithMilliseconds = (timeStamp: string): string => {
    return moment(timeStamp).format("YYYY-MM-DD HH:mm:ss,SSS")
}

export const rfc3339TimestampToDateObject = (timeStamp: string): Date => {
    return moment(timeStamp).toDate()
}

export const yellowColorDependingOnTheme = (darkThemeEnabled: boolean) => {
    return darkThemeEnabled ? "yellow" : "#f0d529"
} 
