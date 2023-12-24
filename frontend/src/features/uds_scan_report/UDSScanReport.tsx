import React, { ReactElement, createRef, useCallback, useEffect, useMemo, useState } from "react"
import { useAppDispatch, useAppSelector } from "../../app/hooks"
import {
    ITestCaseResult,
    TestCase,
    parseScanReport,
    IPacketDescription,
    IStateGraph,
    IScanReport,
    IStateGraphNode,
    IPacketDescriptions,
    ICompletedStates,
    IStateStatistics,
    //IPacketField
} from './parser'
import { ILogRow, IParsedScanRunFindingLogFile, ScanReportLogs } from "../misc/ScanReportLogs"
import { selectUDSScanRunReports, selectUDSScanRuns } from '../uds_scan_run/UDSScanRunsSlice'
import { getReadableUDSEnumeratorNameFrom, TUDSEnumerator } from "../uds_scan_run/UDSScanRun"
import { AutoTooltip, LicenseNeededTextField, getSortComparator, useObserveAndDeleteWidget, authenticatedFetch, IconButtonWithImplicitLicenseCheck } from "../misc/Util"

import { ReactD3GraphViz } from "@hikeman/react-graphviz"
// import { Document, Page, PDFViewer, StyleSheet, Text, View } from '@react-pdf/renderer'
import moment from 'moment'

import Container from '@mui/material/Container'
import TreeItem from "@mui/lab/TreeItem"
import Box from "@mui/material/Box"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TablePagination from "@mui/material/TablePagination"
import TableRow from "@mui/material/TableRow"
import TableSortLabel from "@mui/material/TableSortLabel"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import Paper from "@mui/material/Paper"
import IconButton from '@mui/material/IconButton'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import TextField from "@mui/material/TextField"
import Collapse from "@mui/material/Collapse"
import Tooltip from "@mui/material/Tooltip"
//import Modal from "@mui/material/Modal"
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined"
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined"
import Autocomplete, { autocompleteClasses } from '@mui/material/Autocomplete';
import { useTranslation } from 'react-i18next';
import { VariableSizeList, ListChildComponentProps } from 'react-window';

import { ScanReportAnalyzers } from "../misc/ScanReportAnalyzers"
import { addOrActivateLicensesWidget } from "../main_lumino_widget/MainLuminoWidgetSlice"
import TableRowsIcon from '@mui/icons-material/TableRows';
import Popper from "@mui/material/Popper"
import { styled } from "@mui/material/styles"
import { logger } from "../../app/logging"
import { licenseFeatureDefaultValueMaxAnalyzerResults, licenseFeatureKeyMaxAnalyzerResults } from "../misc/Constants"
import { THeadAlign, TSortOrder } from "../misc/GlobalTypes"
import './UDSScanReport.css'
import { httpBackendURL } from "../../app/api"
import { showUserMessage } from "../user_message/UserMessageSlice"


/* ============================================================================= */

// FIXME: bugs / make it less ugly and more usefull

interface IFilterMatcherData {
    resultRow: ITestCaseResult
    requestDetails: IPacketDescription
    responseDetails?: IPacketDescription
    stateGraphNode: IStateGraphNode
}

class StringConsumer {
    inputString: string

    constructor(inputString: string) {
        this.inputString = inputString
    }

    peek(count: number): string {
        return this.inputString.slice(0, Math.min(count, this.inputString.length))
    }

    consume(count: number): string {
        const res = this.peek(count)
        this.inputString = this.inputString.substring(Math.min(count, this.inputString.length))
        return res
    }

    hasMoreChars(): boolean {
        return this.inputString.length > 0
    }

    removeLeadingWhitespace(): number {
        const lb = this.inputString.length
        this.inputString = this.inputString.trimStart()
        return lb - this.inputString.length
    }
}

class FilterParsingError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "FilterParsingError"
    }
}

class BaseFilterNode {
    childNodes: BaseFilterNode[] = []

    describe(): string {
        throw new TypeError("abstract method called")
    }

    matches(matcherData: IFilterMatcherData): boolean {
        throw new TypeError("abstract method called")
    }

    addChildNode(childNode: BaseFilterNode) {
        this.childNodes.push(childNode)
    }
}

class RootFilterNode extends BaseFilterNode {

    describe(): string {
        if (this.childNodes.length === 0) {
            return "<NONE>"
        } else if (this.childNodes.length === 1) {
            return this.childNodes[0].describe()
        }
        return `(${this.childNodes.map(c => c.describe()).join(" OR ")})`
    }

    matches(matcherData: IFilterMatcherData): boolean {
        return this.childNodes.map(c => c.matches(matcherData)).some(m => m === true)
    }
}

class OrFilterNode extends BaseFilterNode {

    describe(): string {
        if (this.childNodes.length === 0) {
            return "<NONE>"
        } else if (this.childNodes.length === 1) {
            return this.childNodes[0].describe()
        }
        return `(${this.childNodes.map(c => c.describe()).join(" AND ")})`
    }

    matches(matcherData: IFilterMatcherData): boolean {
        return this.childNodes.map(c => c.matches(matcherData)).every(m => m === true)
    }
}

class AndFilterNode extends BaseFilterNode {

    describe(): string {
        if (this.childNodes.length === 1) {
            return this.childNodes[0].describe()
        }
        return "<NONE>"
    }

    matches(matcherData: IFilterMatcherData): boolean {
        if (this.childNodes.length !== 1) {
            throw new Error("expected only one child node")
        }
        return this.childNodes[0].matches(matcherData)
    }
}

class EqualsFilterNode extends BaseFilterNode {
    invertMatch: boolean
    rawMatchKey: string
    rawMatchValue: string
    matchKey: string
    matchValue: string | number

    constructor(matchKey: string, matchValue: string, invertMatch: boolean = false) {
        super()
        this.invertMatch = invertMatch
        this.rawMatchKey = matchKey
        this.rawMatchValue = matchValue

        this.matchKey = this.rawMatchKey.toLowerCase()
        if (this.rawMatchValue[0] === '"' && this.rawMatchValue[this.rawMatchValue.length - 1] === '"') {
            this.matchValue = this.rawMatchValue.slice(1, this.rawMatchValue.length - 1).toLowerCase()
        } else {
            this.matchValue = parseInt(this.rawMatchValue)
            if (isNaN(this.matchValue)) {
                this.matchValue = this.rawMatchValue.toLowerCase()
            }
        }
    }

    describe(): string {
        return `${this.rawMatchKey} ${this.invertMatch ? "unequal" : "equal"} ${this.rawMatchValue}`
    }

    matches(matcherData: IFilterMatcherData): boolean {
        if (this.childNodes.length !== 0) {
            throw new Error("expected no child nodes")
        }
        
        const matchKeyElements = this.matchKey.split(".")

        const _fieldEntryMatches = (e: any): boolean => {
            if (e.name.toLowerCase() !== matchKeyElements[1]) {
                return false
            }

            var valueMatches: boolean = false
            if (Array.isArray(e.value)) {
                // NOTE: altough currently we only have "==" and "!=" as "matching expressions" we count
                //       this as a match if one of the entries in the array matches
                valueMatches = e.value.some((subValue: any) => {
                    return subValue === this.matchValue
                })
            } else {
                valueMatches = e.value === this.matchValue
            }

            return valueMatches || (e.repr.toLowerCase() === this.matchValue)
        }

        const _matches = (): boolean => {
            if (matchKeyElements.length === 1) {
                // TODO: think about a cache
                let resultRowKeyMap: { [key: string]: keyof ITestCaseResult } = {} as any
                (Object.keys(matcherData.resultRow) as (keyof ITestCaseResult)[]).map( k => resultRowKeyMap[k.toLowerCase()] = k )

                // special handling FTW (handle "state" as "readableState")
                resultRowKeyMap["state"] = "readableState"

                // matcherData.resultRow example
                // {"state":"s_0","req":"p_256","resp":"p_1","req_ts":1676647738.8735626,"resp_ts":1676647738.8755424,"uid":255,"roundTripTime":0.001979827880859375,"readableState":"SN=1"}

                return (matcherData.resultRow[resultRowKeyMap[this.matchKey]]?.toString().toLocaleLowerCase() ?? "") === this.matchValue.toString()
            }
            switch(matchKeyElements[0]) {
                case "request":
                    const requestFields = Object.values(matcherData.requestDetails.fields)
                    return requestFields.some((e: any) => {
                        return _fieldEntryMatches(e)
                    })
                case "response":
                    const responseFields = Object.values(matcherData.responseDetails?.fields ?? {})
                    return responseFields.some((e: any) => {
                        return _fieldEntryMatches(e)
                    })
                case "state":
                    // TODO: think about a cache
                    let stateGraphNodeKeyMap: { [key: string]: string } = {} as any
                    (Object.keys(matcherData.stateGraphNode)).map( k => stateGraphNodeKeyMap[k.toLowerCase()] = k )

                    return matcherData.stateGraphNode[stateGraphNodeKeyMap[matchKeyElements[1]]] === this.matchValue
                default:
                    return false
            }
        }
        return this.invertMatch ? !_matches() : _matches()
    }
}

//

const parseAndFilterNode = (inputStringConsumer: StringConsumer): BaseFilterNode => {
    const andNode = new AndFilterNode()
    inputStringConsumer.removeLeadingWhitespace()
    if (inputStringConsumer.peek(1) === "(") {
        inputStringConsumer.consume(1)
        andNode.addChildNode(parseRootFilterNode(inputStringConsumer))
        inputStringConsumer.removeLeadingWhitespace()
        if (inputStringConsumer.consume(1) !== ")") {
            throw new FilterParsingError("expected )")
        }
    } else {
        // key
        let key: string = ""
        inputStringConsumer.removeLeadingWhitespace()
        while (inputStringConsumer.hasMoreChars()) {
            let c = inputStringConsumer.peek(1)
            if (!/[a-zA-Z0-9._]/.test(c)) {
                break
            }
            key += inputStringConsumer.consume(1)
        }
        if (key.length === 0) {
            throw new FilterParsingError("empty key")
        }
        // comperator
        inputStringConsumer.removeLeadingWhitespace()
        let invertMatch: boolean
        switch (inputStringConsumer.peek(2)) {
            case "==":
                invertMatch = false
                break
            case "!=":
                invertMatch = true
                break
            default:
                throw new FilterParsingError("expected == or !=")
        }
        inputStringConsumer.consume(2)
        // value
        let value: string = ""
        inputStringConsumer.removeLeadingWhitespace()
        const expectQuotationMarkEnd = inputStringConsumer.peek(1) === '"'
        if (expectQuotationMarkEnd) {
            value += inputStringConsumer.consume(1)
        }
        while (inputStringConsumer.hasMoreChars()) {
            let c = inputStringConsumer.peek(1)
            const re = new RegExp(expectQuotationMarkEnd ? "[^\"]" : "[a-zA-Z0-9_]")
            if (!re.test(c)) {
                break
            }
            value += inputStringConsumer.consume(1)
        }
        if (expectQuotationMarkEnd === true) {
            if (inputStringConsumer.peek(1) !== '"') {
                throw new FilterParsingError("expected \" at end of value")
            }
            value += inputStringConsumer.consume(1)
        }
        if (value.length === 0) {
            throw new FilterParsingError("empty value")
        }
        andNode.addChildNode(new EqualsFilterNode(key, value, invertMatch))
    }
    return andNode
}

const parseOrFilterNode = (inputStringConsumer: StringConsumer): BaseFilterNode => {
    const orNode = new OrFilterNode()
    orNode.addChildNode(parseAndFilterNode(inputStringConsumer))
    while (inputStringConsumer.hasMoreChars()) {
        inputStringConsumer.removeLeadingWhitespace()
        if (inputStringConsumer.peek(2) === "&&") {
            inputStringConsumer.consume(2)
            orNode.addChildNode(parseAndFilterNode(inputStringConsumer))
        } else {
            break
        }
    }
    return orNode
}

const parseRootFilterNode = (inputStringConsumer: StringConsumer): BaseFilterNode => {
    const rootNode = new RootFilterNode()
    rootNode.addChildNode(parseOrFilterNode(inputStringConsumer))
    while (inputStringConsumer.hasMoreChars()) {
        inputStringConsumer.removeLeadingWhitespace()
        if (inputStringConsumer.peek(2) === "||") {
            inputStringConsumer.consume(2)
            rootNode.addChildNode(parseOrFilterNode(inputStringConsumer))
        } else {
            break
        }
    }
    return rootNode
}

const parseFilter = (inputString: string): BaseFilterNode => {
    const inputStringConsumer = new StringConsumer(inputString) 
    const parsedRootNode = parseRootFilterNode(inputStringConsumer)
    if (inputStringConsumer.hasMoreChars()) {
        throw new FilterParsingError(`failed to parse filter string (left: ${inputStringConsumer.inputString})`)
    }
    return parsedRootNode
}

/* ============================================================================= */

/*
function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
        return -1
    }
    if (b[orderBy] > a[orderBy]) {
        return 1
    }
    return 0
}

function getComparator<Key extends keyof any>(
    order: TSortOrder,
    orderBy: Key
): (
    a: { [key in Key]: number | string | null },
    b: { [key in Key]: number | string | null }
) => number {
    return order === "desc"
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy)
}
*/

interface HeadCell {
    id: keyof ITestCaseResult
    label: string
    align: THeadAlign
}

const headCells: readonly HeadCell[] = [
    {
        id: "uid",
        label: "UID",
        align: "left"
    },
    {
        id: "readableState",
        label: "State",
        align: "left"
    },
    {
        id: "req",
        label: "Request",
        align: "left"
    },
    {
        id: "resp",
        label: "Response",
        align: "left"
    },
    {
        id: "roundTripTime",
        label: "Time (ms)",
        align: "right"
    },
]

interface EnhancedTableProps {
    onRequestSort: (
        event: React.MouseEvent<unknown>,
        property: keyof ITestCaseResult
    ) => void
    order: TSortOrder
    orderBy: string
    rowCount: number
}

function EnhancedTableHead(props: EnhancedTableProps) {
    const {
        order,
        orderBy,
        onRequestSort
    } = props
    const createSortHandler = (property: keyof ITestCaseResult) => (
        event: React.MouseEvent<unknown>
    ) => {
        onRequestSort(event, property)
    }

    return (
        <TableHead>
            <TableRow>
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={headCell.align}
                        padding="normal"
                        sortDirection={orderBy === headCell.id ? order : false}
                    >
                        <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : "asc"}
                            onClick={createSortHandler(headCell.id)}
                        >
                            {headCell.label}
                        </TableSortLabel>
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    )
}

interface EnhancedTableToolbarProps {
    filterPattern: string
    setFilterPattern: (filter: string) => void
    hasValidFilter: boolean
    possibleFilterOptions: IFilterOptions
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
const VirtualListBoxOuterElementContext = React.createContext({})
const VirtualListBoxOuterElementType = React.forwardRef<HTMLDivElement>((props, ref) => {
    const outerProps = React.useContext(VirtualListBoxOuterElementContext)
    return (
        <div ref={ref} {...props} {...outerProps} />
    )
})
const VirtualListBoxComponent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLElement>>((props, ref) => {
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
const VirtualListBoxStyledPopper = styled(Popper)({
    [`& .${autocompleteClasses.listbox}`]: {
        boxSizing: 'border-box',
        '& ul': {
            padding: 0,
            margin: 0,
        },
    },
})

const EnhancedTableToolbar = (props: EnhancedTableToolbarProps) => {
    const inputRef = createRef<HTMLInputElement>()
    const [selectionStart, setSelectionStart] = React.useState(0)

    const { t } = useTranslation()

    const suggestItems = (currentString: string): string[] => {
        let itemList: string[] = []

        // cut off the "tail"
        let stringToMatchAgainst = currentString.slice(0, selectionStart)
        // and the "head"
        stringToMatchAgainst = stringToMatchAgainst.split(/(?:\|\||&&)/).at(-1) ?? ""
        stringToMatchAgainst = stringToMatchAgainst.replace(/\s*\(/, "")
        // get key / value (value may be undefined here)
        let [rawKey, rawVal] = stringToMatchAgainst.split(/==|!=/)

        const getPossibleOptionsFromKeyPath = (keyPath: string[]): IFilterOptions | Set<string> => {
            let currentTreeElement: IFilterOptions | Set<string> = props.possibleFilterOptions
            for (const key of keyPath) {
                if ((currentTreeElement instanceof Set) || (currentTreeElement === undefined)) {
                    break
                } else {
                    currentTreeElement = currentTreeElement[key]
                }
            }
            return currentTreeElement ?? []
        }

        // logger.debug(`KEY: "${rawKey}" VAL: "${rawVal}"`)

        if (rawVal === undefined) {
            // key match -> find the possible entries for the given (partial) key
            let keyPathElements = rawKey.trimStart().split(".")
            // the last element does include trailing whitespace on purpose
            // (only match on non whitespace)
            let lastKeyPathElement = keyPathElements.pop()!
            const possibleOptions = getPossibleOptionsFromKeyPath(keyPathElements)
            // only suggest options in the "key path" (ignore values)
            const possibleOptionsArray: string[] = (possibleOptions instanceof Set) ? [] : Object.keys(possibleOptions)
            itemList = possibleOptionsArray.filter((v: string) => v.startsWith(lastKeyPathElement))
        } else {
            // value match -> filter all possible entries for this key against the given (partial) value
            const matchVal = rawVal.trimStart()
            const possibleOptions = getPossibleOptionsFromKeyPath(rawKey.trim().split("."))
            itemList = (possibleOptions instanceof Set) ? Array.from(possibleOptions).filter((v: string) => v.toString().startsWith(matchVal)) : []
        }

        return itemList
    }

    return (
        <Toolbar
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
                {t("Request / Response Data")}
            </Typography>
            <Autocomplete
                sx={{ marginLeft: 1 }}
                id="tableFilter"
                PopperComponent={VirtualListBoxStyledPopper}
                fullWidth
                disablePortal
                value={props.filterPattern}
                onInputChange={(event, _) => {
                    event?.preventDefault()
                    event?.stopPropagation()
                }}
                ListboxComponent={VirtualListBoxComponent}
                inputValue={props.filterPattern}
                onChange={(_, newInputValue) => {

                    if (newInputValue === null) {
                        // clear listbox button
                        props.setFilterPattern("")
                        return
                    }

                    // skip leading whitespace
                    let probeStartIndex = selectionStart
                    while (/\s/.test(props.filterPattern.charAt(probeStartIndex))) {
                        probeStartIndex++
                    }

                    // logger.debug(`${probeStartIndex} ${props.filterPattern.charAt(probeStartIndex)}`)

                    let startIndex = probeStartIndex
                    while (startIndex > 0) {
                        if (/[\s().!=&|]/.test(props.filterPattern.charAt(startIndex - 1))) {
                            break
                        }
                        startIndex--
                    }

                    let endIndex = probeStartIndex
                    while (endIndex < props.filterPattern.length) {
                        if (/[\s().!=&|]/.test(props.filterPattern.charAt(endIndex))) {
                            break
                        }
                        endIndex++
                    }

                    // logger.debug(`${props.filterPattern.slice(startIndex, endIndex)}`)

                    props.setFilterPattern(props.filterPattern.slice(0, startIndex) + newInputValue + props.filterPattern.slice(endIndex))
                }}
                freeSolo={true}
                style={{ width: 1000 }}
                renderInput={(params) => {
                    return (
                        <TextField 
                            className="autoTextField" 
                            {...params} 
                            variant="outlined" 
                            label={t("Filter")}
                            onSelect={() => setSelectionStart(inputRef?.current?.selectionStart ?? 0)}
                            inputRef={inputRef}
                            color={ props.hasValidFilter ? "success" : "error" }
                            onChange={(e) => { props.setFilterPattern(e.target.value) }}
                            value={props.filterPattern}
                        />
                    )
                }}       
                filterOptions={(x) => x}    
                options={suggestItems(props.filterPattern)}
            />
        </Toolbar>
    )
}

//
// Single test case (enumerator)
//

// TODO: adapt as needed
const testCaseNameToInitialFilterPatternMap: { [name in TUDSEnumerator]: string } = {
    'UDS_ServiceEnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_DSCEnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_RDBIEnumerator': "Response.service != \"negativeResponse\"",
    'UDS_RDBISelectiveEnumerator': "Response.service != \"negativeResponse\"",
    'UDS_WDBISelectiveEnumerator': "Response.service != \"negativeResponse\"",
    'UDS_SAEnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_SA_XOR_Enumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UdsSecurityAccessServerEnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_RCEnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_RCStartEnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_RCSelectiveEnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_RMBAEnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_RMBASequentialEnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_RMBARandomEnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_TPEnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_EREnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_IOCBIEnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_CCEnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_RDEnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_TDEnumerator': "Response.negativeResponseCode != \"generalReject\"",
    'UDS_RDBPIEnumerator': "Response.negativeResponseCode != \"generalReject\""
}

interface IFilterOptions {
    [pathElementName: string]: IFilterOptions | Set<string>
}

interface IGroupedResults {
    [key: string]: ITestCaseResult[]
}

const TestCaseResultTableRow = (props: {
    resultRow: ITestCaseResult,
    groupedResults: IGroupedResults,
    testCasePacketDescriptions: IPacketDescriptions,
    stateGraph: IStateGraph,
    setSelected: () => void
}) => {
    const [expanded, setExpanded] = useState(false)
    // NOTE: this index references the "grouped results" array for the given request (0 means "this request")
    const [selectedRequestIndex, setSelectedRequestIndex] = useState(0)
    const [showJumpToLogTooltip, setShowJumpToLogTooltip] = useState(false)

    const { t } = useTranslation()

    const similarRequests = useMemo(() => {
        const result: ITestCaseResult[] = []
        props.groupedResults[props.resultRow.req].forEach(r => {
            if (r.uid === props.resultRow.uid) {
                result.unshift(r)   // insert as first element ("unshift" ... best function name ever (TM))
            } else {
                result.push(r)
            }
        })
        return result
    }, [props.resultRow, props.groupedResults])

    const makeReadableFieldValue = (value: string | number | [string | number], type: string, preferHex: boolean = true): string => {
        if (typeof value === "object") {
            // FIXME: the filter does not work for these values at the moment ...
            // workaround / quick fix as it seems that type "number" can also be an array ...
            return (value as [string | number]).map((subValue) => makeReadableFieldValue(subValue, type, preferHex)).join(", ")
        }
        if (type !== "number" || preferHex === false) {
            return value.toString()
        }
        return `0x${value.toString(16)}`
    }

    const PacketDetailsTableCell = (props: { title: String, packetDescription?: IPacketDescription }) => {

        const [preferHexValue, setPreferHexValue] = useState(true)

        return (
            <TableCell style={{ borderBottom: 'unset', paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Box sx={{ margin: 1 }}>
                        <Typography variant="h6" gutterBottom>
                            {props.title}
                        </Typography>
                        <Table size="small" aria-label="details">
                            <TableHead>
                                <TableRow>
                                    <TableCell align="left" sx={{fontWeight: "bold", textDecoration: 'underline'}}>{t("Name")}</TableCell>
                                    <TableCell align="left" sx={{fontWeight: "bold", textDecoration: 'underline'}}>{t("Value")}</TableCell>
                                    <TableCell align="left" sx={{fontWeight: "bold", textDecoration: 'underline'}}>{t("Representation")}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.values(props.packetDescription?.fields ?? {}).map( (field: any, index: number) => {
                                    return (
                                        <TableRow key={index}>
                                            <TableCell
                                                sx={{ width: "25%", maxWidth: "200px" }}
                                                align="left"
                                                component="th"
                                                scope="row"
                                            >
                                                <AutoTooltip>
                                                    <Typography variant="body3">{field.name}</Typography>
                                                </AutoTooltip>
                                            </TableCell>
                                            <TableCell
                                                sx={{ width: "40%", maxWidth: "200px" }}
                                                align="left"
                                                onClick={() => setPreferHexValue(!preferHexValue)}
                                            >
                                                <AutoTooltip>
                                                    <Typography variant="body3">{makeReadableFieldValue(field.value, field.type, preferHexValue)}</Typography>
                                                </AutoTooltip>
                                            </TableCell>
                                            <TableCell
                                                sx={{ width: "35%", maxWidth: "200px" }}
                                                align="left"
                                            >
                                                <AutoTooltip>
                                                    <Typography variant="body3">{field.repr}</Typography>
                                                </AutoTooltip>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </Box>
                </Collapse>
            </TableCell>
        )
    }

    const StateDetailTableCell = (props: { stateNode: IStateGraphNode }) => {
        return (
            <TableCell style={{ borderBottom: 'unset', paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Box sx={{ margin: 1 }}>
                        <Typography variant="h6" gutterBottom>
                            {t("State Details")}
                        </Typography>
                        <Table size="small" aria-label="details">
                            <TableHead>
                                <TableRow>
                                    <TableCell align="left" sx={{fontWeight: "bold", textDecoration: 'underline'}}>{t("Name")}</TableCell>
                                    <TableCell align="left" sx={{fontWeight: "bold", textDecoration: 'underline'}}>{t("Value")}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.keys(props.stateNode).map( (name: any, index: number) => {
                                    return (
                                        <TableRow key={index}>
                                            <TableCell
                                                sx={{ width: "25%", maxWidth: "200px" }}
                                                align="left"
                                                component="th"
                                                scope="row"
                                            >
                                                <AutoTooltip>
                                                    <Typography variant="body3">{name}</Typography>
                                                </AutoTooltip>
                                            </TableCell>
                                            <TableCell
                                                sx={{ width: "75%", maxWidth: "200px" }}
                                                align="left"
                                            >
                                                <AutoTooltip>
                                                    <Typography variant="body3">{props.stateNode[name]}</Typography>
                                                </AutoTooltip>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </Box>
                </Collapse>
            </TableCell>
        )
    }

    const rowOnClickHandler = (event: React.MouseEvent<HTMLElement>) => {
        if (event.altKey) {
            props.setSelected()
        } else {
            // show the tooltip for some time
            setShowJumpToLogTooltip(true)
            setTimeout(() => setShowJumpToLogTooltip(false), 1500)
        }
    }

    return (
        <React.Fragment>
            <Tooltip open={showJumpToLogTooltip} title={t("Hold ALT and click on a row to jump to the corresponding log entry") as string}>
                <TableRow>
                    <TableCell
                        scope="row"
                        align={headCells[0].align}
                        sx={{ width: "10%", maxWidth: "100px" }}
                    >
                        <React.Fragment>
                            <IconButton
                                aria-label="expand row"
                                style={{ paddingTop: 0, paddingBottom: 0 }}
                                size="small"
                                onClick={() => { setExpanded((expanded) => !expanded) }}
                            >
                                {expanded ? <KeyboardArrowDownIcon/> : <KeyboardArrowUpIcon/>}
                            </IconButton>
                            {props.resultRow.uid}
                        </React.Fragment>
                    </TableCell>
                    <TableCell
                        align={headCells[1].align}
                        onClick={rowOnClickHandler}
                        sx={{ width: "14%", maxWidth: "200px" }}
                    >
                        {props.resultRow.readableState}
                    </TableCell>
                    <TableCell
                        align={headCells[2].align}
                        onClick={rowOnClickHandler}
                        sx={{ width: "33%", maxWidth: "200px" }}
                    >
                        <AutoTooltip>
                            {props.testCasePacketDescriptions[props.resultRow.req].desc}
                        </AutoTooltip>
                    </TableCell>
                    <TableCell
                        align={headCells[3].align}
                        onClick={rowOnClickHandler}
                        sx={{ width: "33%", maxWidth: "200px" }}
                    >
                        <AutoTooltip>
                            {props.testCasePacketDescriptions[props.resultRow.resp ?? -1]?.desc ?? "-"}
                        </AutoTooltip>
                    </TableCell>
                    <TableCell
                        align={headCells[4].align}
                        onClick={rowOnClickHandler}
                        sx={{ width: "10%", maxWidth: "100px" }}
                    >
                        {(props.resultRow.roundTripTime * 1000).toFixed(2)}
                    </TableCell>
                </TableRow>
            </Tooltip>
            <TableRow>
                <PacketDetailsTableCell
                    title={t("Request Details") as string}
                    packetDescription={props.testCasePacketDescriptions[props.resultRow.req]}
                />
            </TableRow>
            <TableRow>
                <TableCell align="center" style={{ borderBottom: 'unset', paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                    <Collapse in={expanded} timeout="auto" unmountOnExit>
                        <IconButton
                            aria-label="response back"
                            size="small"
                            disabled={selectedRequestIndex <= 0}
                            onClick={() => setSelectedRequestIndex(selectedRequestIndex - 1)}
                        >
                            <KeyboardArrowLeftIcon/>
                        </IconButton>
                        {selectedRequestIndex === 0 ? t("Response and State Details for this Request") :
                                                        `${t("Response and State Details for similar Request with UID")} ${similarRequests[selectedRequestIndex].uid}`}
                        <IconButton
                            aria-label="response forward"
                            size="small"
                            disabled={selectedRequestIndex >= similarRequests.length - 1}
                            onClick={() => setSelectedRequestIndex(selectedRequestIndex + 1)}
                        >
                            <KeyboardArrowRightIcon/>
                        </IconButton>
                    </Collapse>
                </TableCell>
            </TableRow>
            <TableRow>
                <PacketDetailsTableCell
                    title={t("Response Details") as string}
                    packetDescription={props.testCasePacketDescriptions[similarRequests[selectedRequestIndex].resp ?? -1]}
                />
            </TableRow>
            <TableRow>
                <StateDetailTableCell
                    stateNode={props.stateGraph.nodes[similarRequests[selectedRequestIndex].state]}
                />
            </TableRow>
        </React.Fragment>
    )
}

const TestCaseStateStatistics = (props: {
    testCase: TestCase
}) => {

    const [showContentTable, setShowContentTable] = useState(false)

    const { t } = useTranslation()

    /*
    answertime_avg: string      // "0.00448"
    answertime_avg_nr: string
    answertime_avg_pr: string
    answertime_max: string
    answertime_max_nr: string
    answertime_max_pr: string
    answertime_min: string
    answertime_min_nr: string
    answertime_min_pr: string
    num_answered: string
    num_negative_resps: string
    num_unanswered: string
    */

    const mapIdent = (v: string) => v
    const mapToMS = (v: string) => {
        const nf = parseFloat(v)
        if (isNaN(nf)) {
            return v
        }
        return nf.toFixed(2).toString()
    }

    // [Label, Key, ValueMapFunction]
    const tableColumns: [string, keyof IStateStatistics, (v: string) => string][] = [[t("State"), "readableState", mapIdent],
                                                                                     [t("Answertime (avg ms)"), "answertime_avg", mapToMS],
                                                                                     [t("Answertime (neg avg ms)"), "answertime_avg_nr", mapToMS],
                                                                                     [t("Answertime (pos avg ms)"), "answertime_avg_pr", mapToMS],
                                                                                     [t("Answertime (max ms)"), "answertime_max", mapToMS],
                                                                                     [t("Answertime (neg max ms)"), "answertime_max_nr", mapToMS],
                                                                                     [t("Answertime (pos max ms)"), "answertime_max_pr", mapToMS],
                                                                                     [t("Answertime (min ms)"), "answertime_min", mapToMS],
                                                                                     [t("Answertime (neg min ms)"), "answertime_min_nr", mapToMS],
                                                                                     [t("Answertime (pos min ms)"), "answertime_min_pr", mapToMS],
                                                                                     [t("Answered"), "num_answered", mapIdent],
                                                                                     [t("Neg. Response"), "num_negative_resps", mapIdent],
                                                                                     [t("Unanswered"), "num_unanswered", mapIdent]]

    const showTestCaseStatisticsContentButton = (
        <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setShowContentTable(!showContentTable)}
        >
            {showContentTable ? <KeyboardArrowDownIcon/> : <KeyboardArrowUpIcon/>}
        </IconButton>
    )

    return (
        <div>
            {showTestCaseStatisticsContentButton} {t("Statistics")}
            {showContentTable ? (
                <Box sx={{ width: "100%" }}>
                    <TableContainer>
                        <Table
                            sx={{ minWidth: 750 }}
                            aria-labelledby="tableTitle"
                            size="small"
                        >
                            <TableHead>
                                <TableRow
                                    sx={{ width: "100%" }}
                                    key={'row_head'}
                                >
                                    {tableColumns.map((col, index) => {
                                        return (
                                            <TableCell
                                                sx={{ width: `"${100 / tableColumns.length}%"` }}
                                                key={`head_${index}`}
                                            >
                                                {col[0]}
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.values(props.testCase.stateStatistics).map((state, row_index) => {
                                    return (
                                        <TableRow
                                            sx={{ width: "100%" }}
                                            key={`row_body_${row_index}`}
                                        >
                                            {tableColumns.map((col, col_index) => {
                                                return (
                                                    <TableCell
                                                        sx={{ width: `"${100 / tableColumns.length}%"` }}
                                                        key={`row_body_${row_index}_${col_index}`}
                                                    >
                                                        {col[2](state[col[1]])}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            ) : <></>}
        </div>
    )
}

const UDSScanReportTestCaseComponent = (props: {
    testCase: TestCase
    stateGraph: IStateGraph
    selectedStateGraphNodeTag: string | undefined
    selectedResultRow: ITestCaseResult | undefined
    setSelectedResultRow: (selected: ITestCaseResult | undefined) => void
}) => {
    const [order, setOrder] = useState<TSortOrder>("asc")
    const [orderBy, setOrderBy] = useState<keyof ITestCaseResult>("req_ts")
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(25)
    const [filterPattern, setFilterPattern] = useState(testCaseNameToInitialFilterPatternMap[props.testCase.name as TUDSEnumerator] ?? '')
    const [showContentTable, setShowContentTable] = useState(false)

    const testCase: TestCase = props.testCase
    const testCaseResults = testCase.results
    const testCasePacketDescriptions = useMemo(() => {
        return {...testCase.packetDescriptions}
    }, [testCase.packetDescriptions])
    const stateGraph = props.stateGraph

    const { t } = useTranslation()

    // remove ' from representation for easier filtering
    for (const [key, value] of Object.entries(testCasePacketDescriptions)) {
        for (const [fieldKey, fieldValue] of Object.entries(value.fields)) {
            const representation = fieldValue.repr
            if (representation.charAt(0) === "'" && representation.charAt(representation.length - 1) === "'") {
                testCasePacketDescriptions[key].fields[fieldKey as any].repr = `${representation.slice(1, -1)}`
            }
        }
    }

    const prepareRepresentation = (repr: string, type: string) => {
        // bytes need to be enclosed by quotes, because they can
        // contain chars which are not included in our pattern 
        // matching chars list
        if (type === "bytes") {
            return `"${repr}"`
        }
        return repr
    }

    const possibleFilterOptions: IFilterOptions = useMemo(() => {
        // FIXME: somehow fetch the possible type keys from ITestCaseResult
        //        (seems that is not easily possible, you can get the keys as "type" but its impossible to then get an array from that ...
        //         the only way seems to be some uber ugly and bloatet introspection)
        // let options: IFilterOptions = { "": new Set(["uid", "state", "readableState", "resp"]) }
        let options: IFilterOptions = {}
        const requestOptions: IFilterOptions = options["Request"] = {}
        const responseOptions: IFilterOptions = options["Response"] = {}
        const stateOptions: IFilterOptions = options["State"] = {}
        const uidOptions: Set<string> = options["UID"] = new Set<string>()
        testCaseResults.forEach(row => {
            const maxEntryLength = 50
            // uid
            uidOptions.add(row.uid.toString())
            // request
            Object.values(testCasePacketDescriptions[row.req].fields).forEach(f => {
                let entry = requestOptions[f.name] = (requestOptions[f.name] ?? new Set<string>())
                if (entry instanceof Set) {
                    const value = f.value.toString()
                    const repr = f.repr.toString()
                    if (value.length <= maxEntryLength) {
                        entry.add(value)
                    }
                    if (repr.length <= maxEntryLength) {
                        entry.add(prepareRepresentation(repr, f.type))
                    }
                }
            })
            // response
            Object.values(row.resp === null ? [] : testCasePacketDescriptions[row.resp].fields).forEach(f => {
                let entry = responseOptions[f.name] = (responseOptions[f.name] ?? new Set<string | number>())
                if (entry instanceof Set) {
                    const value = f.value.toString()
                    const repr = f.repr.toString()
                    if (value.length <= 50) {
                        entry.add(value)
                    }
                    if (repr.length <= 50) {
                        entry.add(prepareRepresentation(repr, f.type))
                    }
                }
            })
            // state
            Object.entries(stateGraph.nodes[row.state]).forEach(([key, value]) => {
                let entry = stateOptions[key] = (stateOptions[key] ?? new Set<string | number>())
                if (entry instanceof Set) {
                    const stateValue = value.toString()
                    if (stateValue.length <= 50) {
                        entry.add(stateValue)
                    }
                }
            })
        })
        return options
    }, [testCaseResults, testCasePacketDescriptions, stateGraph])

    const groupedResults: IGroupedResults = useMemo(() => {
        let results: IGroupedResults = {}
        testCaseResults.forEach(row => {
            // group by "request id"
            let group = results[row.req] ?? []
            group.push(row)
            results[row.req] = group
        })
        return results
    }, [testCaseResults])

    useEffect(() => {
        if (props.selectedStateGraphNodeTag !== undefined) {
            const stateFilterPattern = `state == "${props.selectedStateGraphNodeTag}"`
            const oldFilterPattern = filterPattern.replace(/^state\s*==\s*".+"\s*(?:&&)?\s*(?:\((.*)\))?\s*$/, "$1")
            setFilterPattern(oldFilterPattern.length === 0 ? stateFilterPattern : `${stateFilterPattern} && (${oldFilterPattern})`)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.selectedStateGraphNodeTag])

    const showTestCaseContentButton = (
        <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setShowContentTable(!showContentTable)}
        >
            {showContentTable ? <KeyboardArrowDownIcon/> : <KeyboardArrowUpIcon/>}
        </IconButton>
    )

    const handleRequestSort = (
        event: React.MouseEvent<unknown>,
        property: keyof ITestCaseResult
    ) => {
        const isAsc = orderBy === property && order === "asc"
        setOrder(isAsc ? "desc" : "asc")
        setOrderBy(property)
    }

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    // avoid a layout jump when reaching the last page with empty rows.
    const emptyRowCount = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - testCaseResults.length) : 0

    // filter
    const [rootFilterNode, setRootFilterNode] = useState<BaseFilterNode | null>(null)

    useEffect(() => {
        // This timeout is placed here due to a previous race condition.
        // This race condition occurred if a "local" filterPattern state 
        // was used in EnhancedTableToolbar which "synced" its state to this 
        // filterPattern (and vice versa if filterPattern here gets changed).
        // Note: if this ever gets reused, maybe try to put both the local and 
        // the filterPattern here in the props of EnhancedTableToolbar. This could
        // fix the race condition.
        const timeoutHandle = setTimeout(() => {
            try {
                logger.debug(`parsing filter pattern '${filterPattern}'`)
                const rootFilterNode = parseFilter(filterPattern)
                logger.debug("filter parsing succeeded")
                logger.debug(rootFilterNode.describe())
                setRootFilterNode(rootFilterNode)
            } catch (error) {
                setRootFilterNode(null)
                logger.debug("filter parsing failed")
                //logger.debug(error)
            }
        }, 500)
        return () => clearTimeout(timeoutHandle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterPattern])
    const filterTableRow = useCallback((resultRow: ITestCaseResult): boolean => {
        return (rootFilterNode?.matches({ resultRow: resultRow,
                                          requestDetails: testCasePacketDescriptions[resultRow.req],
                                          responseDetails: testCasePacketDescriptions[resultRow.resp ?? -1],
                                          stateGraphNode: stateGraph.nodes[resultRow.state]
                                        }) ?? true)
    }, [rootFilterNode, stateGraph.nodes, testCasePacketDescriptions])

    const filteredRows = useMemo(
        () => testCaseResults.slice().sort(getSortComparator(order, orderBy)).filter((r) => filterTableRow(r)),
        [order, orderBy, filterTableRow, testCaseResults]
      )

    // Automatically jump to page 0 if filteredRows changed
    // (otherwise page will be left at last value and may show no table entries)
    useEffect(() => {
        setPage(0)
    }, [filteredRows])

    /*
    const PDFReportTableViewer = (props: { rows: ITestCaseResult[] }) => {
        return (
            <PDFViewer width="100%" height="100%">
                <Document>
                    <Page size="A4" style={pdfStyles.page}>
                        <PDFReportTable rows={props.rows}/>
                    </Page>
                </Document>
            </PDFViewer>
        )
    }
    */

    const TestCaseCompletionIndicator = (props: { testCase: TestCase }) => {
        const makeTooltipDescriptionFrom = ( completedStates: ICompletedStates ): string =>
            Object.keys(completedStates).sort().map(k => `${completedStates[k].readableState} was ${completedStates[k].completed ? t("completed") : t("NOT completed")}`).join(" | ")
        return (
            <Tooltip
                title={makeTooltipDescriptionFrom(props.testCase.completedStates)}
                disableHoverListener={props.testCase.completed}
            >
                {props.testCase.completed ? 
                    <CheckCircleOutlineOutlinedIcon sx={{ color: "green" }}/> : 
                    <CancelOutlinedIcon sx={{ color: "red" }}/>
                }
            </Tooltip>
        )
    } 

    const TestCaseName = (props: { testCase: TestCase }) => (
        <span>
            {getReadableUDSEnumeratorNameFrom(props.testCase.name as TUDSEnumerator)}
        </span>
    )

    return (
        <div>
            <h1>{showTestCaseContentButton} <TestCaseName testCase={testCase}/> <TestCaseCompletionIndicator testCase={testCase}/></h1>
            {
                showContentTable ? (
                    <Box sx={{ width: "100%" }}>
                        <Box sx={{ paddingLeft: 1, paddingBottom: 1, paddingTop: "unset" }}>
                            <TestCaseStateStatistics
                                testCase={testCase}
                            />
                        </Box>
                        <Paper sx={{ width: "100%", mb: 2 }}>
                            <EnhancedTableToolbar
                                hasValidFilter={rootFilterNode !== null}
                                filterPattern={filterPattern}
                                setFilterPattern={setFilterPattern}
                                possibleFilterOptions={possibleFilterOptions}
                            />
                            <TableContainer>
                                <Table
                                    sx={{ minWidth: 750 }}
                                    aria-labelledby="tableTitle"
                                    size="small"
                                >
                                    <EnhancedTableHead
                                        order={order}
                                        orderBy={orderBy}
                                        onRequestSort={handleRequestSort}
                                        rowCount={filteredRows.length}
                                    />
                                    <TableBody>
                                        {filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((r, i) =>
                                            <TestCaseResultTableRow
                                                key={r.uid}
                                                groupedResults={groupedResults}
                                                testCasePacketDescriptions={testCasePacketDescriptions}
                                                stateGraph={stateGraph}
                                                resultRow={r}
                                                setSelected={() => props.setSelectedResultRow(r) }
                                            />
                                        )}
                                        {emptyRowCount > 0 && (
                                            <TableRow
                                                style={{
                                                    height: 33 * emptyRowCount
                                                }}
                                            >
                                                <TableCell colSpan={5}/>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <TablePagination
                                rowsPerPageOptions={[25, 50]}
                                component="div"
                                count={filteredRows.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={handleChangePage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                            />
                        </Paper>
                    </Box>
                ) : <></>
            }
        </div>
    )
}

//
// State graph
//

const UDSScanReportStateGraph = (props: {
    onSelectStateGraphNode: (nodeTag: string) => void
    stateGraph: IStateGraph
}) => {
    const { t } = useTranslation()
    return (
        <Box sx={{ textAlign: "center", width: "100%", border: 0.5, borderRadius: 1 }}>
            <h3>{t("State Graph")}</h3>
            {props.stateGraph.graphviz_source.length === 0 ? <></> :
                <ReactD3GraphViz
                    key="stateGraph"
                    dot={props.stateGraph.graphviz_source}
                    onClick={props.onSelectStateGraphNode}
                />
            }
        </Box>
    )
}

//
// PDF Report
//

// TODO: add the actual content
/*
const pdfStyles = StyleSheet.create({
    page: {
        fontSize: 11,
        flexDirection: "column",
    },
    table: {
        width: '100%',
    },
    row: {
        display: 'flex',
        flexDirection: 'row',
        borderTop: '1px solid #EEE',
        paddingTop: 8,
        paddingBottom: 8,
    },
    header: {
        borderTop: 'none',
    },
    bold: {
        fontWeight: 'bold',
    },
    row1: {
        width: '10%',
    },
    row2: {
        width: '14%',
    },
    row3: {
        width: '33%',
    },
    row4: {
        width: '33%',
    },
    row5: {
        width: '10%',
    },
})
*/

/*
const PDFReportTable = (props: { rows: ITestCaseResult[] }) => {
    // this is just a test for now (the "real" content will not contain the table)
    let headerStyle = {}
    headerStyle = Object.assign(headerStyle, pdfStyles.row)
    headerStyle = Object.assign(headerStyle, pdfStyles.header)
    headerStyle = Object.assign(headerStyle, pdfStyles.bold)
    return (
        <View style={pdfStyles.table}>
            <View style={headerStyle}>
                <Text style={pdfStyles.row1}>UID</Text>
                <Text style={pdfStyles.row2}>State</Text>
                <Text style={pdfStyles.row3}>Request</Text>
                <Text style={pdfStyles.row4}>Response</Text>
                <Text style={pdfStyles.row5}>Time</Text>
            </View>
            {props.rows.map(row => (
                <View key={row.uid} style={pdfStyles.row} wrap={false}>
                    <Text style={pdfStyles.row1}>
                        <Text style={pdfStyles.bold}>{row.uid}</Text>
                    </Text>
                    <Text style={pdfStyles.row2}>{row.readableState}</Text>
                    <Text style={pdfStyles.row3}>{row.req}</Text>
                    <Text style={pdfStyles.row4}>{row.resp}</Text>
                    <Text style={pdfStyles.row5}>{(row.roundTripTime * 1000).toFixed(2)}</Text>
                </View>
            ))}
        </View>
    )
}
*/

//
// Main page
//

export const UDSScanReport = (props: any) => {

    const [localLogFiles, setLocalLogFiles] = useState<IParsedScanRunFindingLogFile[]>([])
    const [localReport, setLocalReport] = useState<IScanReport | null>(null)
    const [selectedStateGraphNodeTag, setSelectedStateGraphNodeTag] = useState<string | undefined>(undefined)
    const [selectedResultRow, setSelectedResultRow] = useState<ITestCaseResult | undefined>(undefined)
    const [dataRequested, setDataRequested] = useState(false)
    const udsScanReports = useAppSelector(selectUDSScanRunReports)
    const scanReport = udsScanReports.filter(scanRunFinding => scanRunFinding.id === props.scanReportId)[0] ?? props.staticInjectedScanReport
    const analyzers = scanReport?.analyzer_results ?? []

    const { t } = useTranslation() 

    const dispatch = useAppDispatch()
    useObserveAndDeleteWidget("UDSSCANREPORT", udsScanReports)

    if (!dataRequested && scanReport !== undefined) {

        const defaultHeader = new Headers()
        // const noCacheHeader = new Headers({ "pragma": "no-cache", "cache-control": "no-cache" })

        // result
        fetch(scanReport.results_file, { method: "GET", headers: defaultHeader })
            .then((response) => response.json())
            .then(data => setLocalReport(parseScanReport(data)))

        // logs
        scanReport.log_files.forEach(logFileDescription => {
            fetch(logFileDescription.log_file, { method: "GET", headers: defaultHeader })
                .then(response => response.text())
                .then(text => {
                    const logRows = text.split("\n").reduce((cookedRows: ILogRow[], rawLogLine: string): ILogRow[] => {
                        if (rawLogLine.length > 0) {
                            const cols = rawLogLine.split(" - ")
                            cookedRows.push({ // date: moment.utc(cols[0], "YYYY-MM-DD hh:mm:ss,SSS").toDate(), // 2022-08-03 10:42:23,696
                                              type: logFileDescription.log_type,
                                              cols: cols })
                        }
                        return cookedRows
                    }, [])
                    const parsedLogFileData = { ...logFileDescription, logRows: logRows }
                    setLocalLogFiles(localLogFiles => localLogFiles.concat(parsedLogFileData))
                })
        })

        setDataRequested(true)
    }

    const onSelectStateGraphNode = (nodeTag: string) => {
        setSelectedStateGraphNodeTag(nodeTag)
    }

    const checkIfLicenseForMaxAnalyzerResults = () => {
        let licenseAvailable = true
        return licenseAvailable
    }

    const handleCSVReportDownload = () => {
        let headers = new Headers()
        headers.append('Content-Type', 'application/x-zip-compressed')
        headers.append('Accept', 'application/x-zip-compressed')

        authenticatedFetch(`${httpBackendURL}/api/uds_scan_run_findings/${scanReport.id}/download_zipped_csv_report/`, "GET", headers).then(response => {
            if(response.status !== 200){
                dispatch(showUserMessage({ title: t('CSV report download failed'), message: t("The requested CSV report does not seem to exist") }))
                return
            }
            response.blob().then(blob => {
                const fileURL = window.URL.createObjectURL(blob)
                let alink = document.createElement('a')
                alink.href = fileURL
                alink.download = `uds_report_${scanReport.id}_csv_reports.zip`
                alink.click()
            })
        })
    }

    return (
        <Container maxWidth={false} sx={{overflow: "hidden", overflowY: "auto", width: "100%", height: "100%"}}>
            {localReport === null ? t("Downloading ...") :
                [
                    <IconButtonWithImplicitLicenseCheck
                        id="csv-report-button"
                        key="csv-report-button"
                        keyProp="csv-report-button"
                        text={t("Generate CSV Report")}
                        disableRipple={true}
                        size="small"
                        icon={TableRowsIcon}
                        disabledCondition={false}
                        onClickCallback={ () => handleCSVReportDownload() }
                    />
                ].concat(localReport.testCases.map((tc: TestCase) => (
                    <UDSScanReportTestCaseComponent testCase={tc}
                                                    stateGraph={localReport.stateGraph}
                                                    selectedStateGraphNodeTag={selectedStateGraphNodeTag}
                                                    selectedResultRow={selectedResultRow}
                                                    setSelectedResultRow={setSelectedResultRow}
                                                    key={tc.name}/>
                ))).concat(
                    <Box key="theBox">
                        <UDSScanReportStateGraph 
                            stateGraph={localReport.stateGraph}
                            onSelectStateGraphNode={onSelectStateGraphNode}
                            key="stateGraph"
                        />
                        {checkIfLicenseForMaxAnalyzerResults() ? <br/>: 
                        <div>
                            <br/>
                            <Tooltip title={t("Click to go to the license page") as string}>
                                <LicenseNeededTextField
                                variant="outlined"
                                fullWidth
                                disabled
                                value={t("The result list is limited to {{maxValue}} entries without a paid license.", {maxValue: licenseFeatureDefaultValueMaxAnalyzerResults})}
                                onClick={() => dispatch(addOrActivateLicensesWidget())}
                                />
                            </Tooltip>
                        </div>
                        }
                        <Box
                            sx={{ height: 10 * 33 }}
                        >    
                            <ScanReportAnalyzers
                                analyzers={analyzers}
                                key={"analyzers"}
                            />
                        </Box>

                        <br/>
                        <Box
                            sx={{ height: 25 * 33 }}
                        >
                            <ScanReportLogs
                                logs={localLogFiles}
                                scrollToTime={selectedResultRow === undefined ? undefined : moment.unix(selectedResultRow.req_ts).utc().format("YYYY-MM-DD HH:mm:ss,SSS")}
                                key="logFiles"
                            />
                        </Box>
                    </Box>
                )
            }
        </Container>
    )
}

//
// Navigation tree list of scan run findings grouped by scan runs
// 

export const UDSScanRunReports = () => {

    const udsScanRuns = useAppSelector(selectUDSScanRuns)

    const { t } = useTranslation();
    
    const udsScanRunReportsTreeItems = udsScanRuns.map(scanRun => {
        const udsScanRunReportsForSingleScanRun = scanRun.scan_run_findings.map(scanRunFinding => {
            const treeNodeId = `UDSSCANREPORT::${scanRunFinding.id}`
            return (
                <TreeItem
                    key={scanRunFinding.id}
                    nodeId={treeNodeId}
                    label={scanRunFinding.results_file}
                />
            )
        })
        // NOTE: add a '_' prefix to disable the "uds scan run" page activation when the scan name in the report tree list is clicked
        const treeNodeId = `_REPORTUDSSCANRUN::${scanRun.id}`
        return (
            <TreeItem
                key={scanRun.id}
                nodeId={treeNodeId}
                label={scanRun.config.name}
            >
                {udsScanRunReportsForSingleScanRun}
            </TreeItem>
        )
    })

    return (
        <TreeItem nodeId="UDSSCANRUNREPORTS" label={t("UDS Scan Run Reports")}>
            {/*<TreeItem nodeId="UDSSCANREPORT" label={t('Sample UDS Scan Report')}/>*/}
            {udsScanRunReportsTreeItems}
        </TreeItem>
    )
}