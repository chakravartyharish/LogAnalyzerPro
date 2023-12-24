import React, { useEffect, useMemo, useRef, useState } from "react"
import { IScanRunFindingLogFile, TLogFileType } from '../uds_scan_run/UDSScanRunsSlice'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList } from 'react-window'
import { AutoTooltip, makeRGBAColorList } from "./Util"

import Box from "@mui/material/Box"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import TableSortLabel from "@mui/material/TableSortLabel"
import Typography from "@mui/material/Typography"
import Paper from "@mui/material/Paper"
import Checkbox from "@mui/material/Checkbox"
import Toolbar from "@mui/material/Toolbar"
import { useTranslation } from "react-i18next"
import { logger } from "../../app/logging"

//
// Scan log files
//

export interface ILogRow {
    type: TLogFileType
    cols: string[]
}

export interface IParsedScanRunFindingLogFile extends IScanRunFindingLogFile {
    logRows: ILogRow[]
}

export const ScanReportLogs = (props: {
    logs: IParsedScanRunFindingLogFile[]
    scrollToTime: string | undefined    // "YYYY-MM-DD hh:mm:ss,SSS"
}) => {
    
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
    const [sortColumn, setSortColumn] = useState(0)
    const [disabledLogTypes, setDisabledLogTypes] = useState<TLogFileType[]>([])
    const fixedSizeListRef = useRef<FixedSizeList>(null)
    const contentTableRef = useRef<HTMLTableElement>(null)

    const { t } = useTranslation()

    // const logTypeColors: string[] = ["rgba(128, 0, 0, 0.1)", "rgba(0, 128, 0, 0.1)", "rgba(0, 0, 128, 0.1)", "rgba(0, 128, 128, 0.1)", "rgba(128, 128, 0, 0.1)"]
    const logTypeColors: string[] = useMemo(() => makeRGBAColorList(0.5, 479, 207), [])
    const logTypes: TLogFileType[] = props.logs.map(log => log.log_type).sort()
    const mergedLogLineRows: ILogRow[] = useMemo(() => {
        return props.logs.filter(log => disabledLogTypes.includes(log.log_type) === false).map(e => e.logRows).reduce((l, r) => l.concat(r), [])
    }, [disabledLogTypes, props.logs])
    const sortedLogLineRows: ILogRow[] = useMemo(() => {
        const rowSortComparator = (a: ILogRow, b: ILogRow): number => {
            return (a.cols[sortColumn] < b.cols[sortColumn] ? -1 : 1) * (sortOrder === "asc" ? 1 : -1)
        }
        return mergedLogLineRows.sort(rowSortComparator)
    }, [mergedLogLineRows, sortColumn, sortOrder])
    
    useEffect(() => {
        if (props.scrollToTime === undefined) {
            return
        }
        // logger.debug(props.scrollToTime)
        const distantPast = "1970-01-01 00:00:00,000"
        let lastLogLineTime: string | undefined = undefined
        let pickedLogLineIndex: number = -1
        let index = 0
        for (const logLine of sortedLogLineRows) {
            const logLineTime = logLine.cols[0]
            if (lastLogLineTime !== undefined) {
                if ((lastLogLineTime <= (props.scrollToTime ?? distantPast) && logLineTime >= (props.scrollToTime ?? distantPast)) ||
                    (lastLogLineTime >= (props.scrollToTime ?? distantPast) && logLineTime <= (props.scrollToTime ?? distantPast))) {

                   pickedLogLineIndex = index 
                   break
                }
            }
            lastLogLineTime = logLineTime
            index += 1
        }
        if (pickedLogLineIndex !== -1) {
            logger.debug(`scrolling to entry with index ${pickedLogLineIndex} and date ${sortedLogLineRows[pickedLogLineIndex].cols[0]}`)
            fixedSizeListRef.current?.scrollToItem(pickedLogLineIndex, "start")
            contentTableRef.current?.scrollIntoView()
        }
    }, [props.scrollToTime, sortedLogLineRows])

    const handleChangeCheckBox = (logType: TLogFileType, checked: boolean) => {
        if (checked) {
            setDisabledLogTypes((disabledLogTypes) => disabledLogTypes.filter(t => t !== logType))
        } else {
            setDisabledLogTypes((disabledLogTypes) => disabledLogTypes.concat(logType))
        }
    }
    
    const handleToggleSortOrderFor = (column: number) => {
        setSortOrder(column === sortColumn ? (sortOrder === "asc" ? "desc" : "asc") : "asc")
        setSortColumn(column)
    }

    const LogTableRow = (props: { index: any, style: any, data: { autoWidth: number } }) => {

        // logger.debug(index)

        const logRow = sortedLogLineRows[props.index]
        const backgroundColor = logTypeColors[logTypes.indexOf(logRow.type) % logTypeColors.length]

        const timeColWidth = (props.data.autoWidth / 4 * 1)
        const textColWidth = (props.data.autoWidth / 4 * 3)

        return (
            <TableRow
                sx={{ width: (timeColWidth + textColWidth), backgroundColor: backgroundColor }}
                style={props.style}
                component="div"
            >
                <TableCell
                    align="left"
                    sx={{ maxWidth: timeColWidth }}
                    component="div"
                >
                    <AutoTooltip>
                        {logRow.cols[0]}
                    </AutoTooltip>
                </TableCell>
                <TableCell
                    align="left"
                    sx={{ maxWidth: textColWidth, width: textColWidth }}
                    component="div"
                >
                    <AutoTooltip>
                        {logRow.cols[1]}
                    </AutoTooltip>
                </TableCell>
            </TableRow>
        )
    }

    return (
        <Box sx={{ width: "100%", height: "100%" }}>
            <Paper sx={{ width: "100%", height: "100%", mb: 2 }}>
                <Toolbar
                    sx={{
                        pl: { sm: 2 },
                        pr: { xs: 1, sm: 1 },
                        height: "10%"
                    }}
                >
                    <Typography
                        sx={{ flex: "1 1 100%" }}
                        variant="h6"
                        id="tableTitle"
                    >
                        {t("Logs")}
                    </Typography>
                    <React.Fragment>
                        {logTypes.map((logType, index) => {
                            const color = logTypeColors[index % logTypeColors.length]
                            return (
                                <React.Fragment key={logType}>
                                    <Checkbox
                                        checked={disabledLogTypes.includes(logType) === false}
                                        onChange={(e) => handleChangeCheckBox(logType, e.target.checked)}
                                    /> <div style={{ backgroundColor: color }}>{`${logType[0].toUpperCase()}${logType.slice(1).toLowerCase()}`}</div>
                                </React.Fragment>
                            )
                        })} 
                    </React.Fragment>
                </Toolbar>
                <div style={{ height: "90%", width: "100%" }}>
                    <Table
                        ref={contentTableRef}
                        sx={{ width: "100%", height: "100%" }}
                        aria-labelledby="tableTitle"
                        size="small"
                        component="div"
                    >
                        <TableHead
                            component="div"
                            sx={{ width: "100%" }}
                        >
                            <TableRow
                                component="div"
                                sx={{ width: "100%" }}
                            >
                                <TableCell
                                    key="time"
                                    align="left"
                                    padding="normal"
                                    sortDirection={sortColumn === 0 ? sortOrder : false}
                                    component="div"
                                >
                                    <TableSortLabel
                                        active={sortColumn === 0}
                                        direction={sortColumn === 0 ? sortOrder : "asc"}
                                        onClick={() => handleToggleSortOrderFor(0)}
                                    >
                                        {t("Time")} 
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    key="logline"
                                    align="left"
                                    padding="normal"
                                    sortDirection={sortColumn === 1 ? sortOrder : false}
                                    component="div"
                                >
                                    <TableSortLabel
                                        active={sortColumn === 1}
                                        direction={sortColumn === 1 ? sortOrder : "asc"}
                                        onClick={() => handleToggleSortOrderFor(1)}
                                    >
                                        {t("Logline")}
                                    </TableSortLabel>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody
                            component="div"
                            sx={{ width: "100%", height: "100%" }}
                        >
                            <AutoSizer>
                                {({height, width}) => (
                                    <FixedSizeList
                                        ref={fixedSizeListRef}
                                        height={height}
                                        width={width}
                                        itemSize={33}   // row height
                                        itemCount={sortedLogLineRows.length}
                                        itemData={{ autoWidth: width }}
                                    >
                                        {LogTableRow}
                                    </FixedSizeList>
                                )}
                            </AutoSizer>
                        </TableBody>
                    </Table>
                </div>
            </Paper>
        </Box>
    )
}