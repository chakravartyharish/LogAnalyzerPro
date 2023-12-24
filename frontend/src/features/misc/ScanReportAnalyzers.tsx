import React, { useMemo, useRef, useState } from "react"
import { AnalyzerResultTypeEnum, IAnalyzerResult, TAnalyzerResultType } from '../uds_scan_run/UDSScanRunsSlice'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList } from 'react-window'
import { AutoTooltip } from "./Util"

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

export interface IAnalyzerRow {
    cols: string[]
}

export interface IParsedScanRunAnalyzers extends IAnalyzerResult {
    rows: IAnalyzerRow[]
}

export const ScanReportAnalyzers = (props: {
    analyzers: IAnalyzerResult[]
}) => {
    
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
    const [sortColumn, setSortColumn] = useState(0)
    const [disabledTypes, setDisabledTypes] = useState<TAnalyzerResultType[]>([])
    const fixedSizeListRef = useRef<FixedSizeList>(null)
    const contentTableRef = useRef<HTMLTableElement>(null)

    const { t } = useTranslation()

    const typeColors: object = {
        [AnalyzerResultTypeEnum.INFORMAL]: "rgba(0, 128, 0, 0.1)", // green
        [AnalyzerResultTypeEnum.WARNING]: "rgba(128, 128, 0, 0.1)", // yellow
        [AnalyzerResultTypeEnum.VULNERABILITY]: "rgba(128, 0, 0, 0.1)" // red
    }
    const types: TAnalyzerResultType[] = props.analyzers.map(analyzer => analyzer.result_type).sort().filter((item, pos, ary) => {return !pos || item !== ary[pos - 1];})
    const mergedLineRows: IAnalyzerRow[] = useMemo(() => {
        return props.analyzers.filter(analyzer => disabledTypes.includes(analyzer.result_type) === false).map(e => ({cols: [e.result_type as string, e.name, e.info]}))
    }, [disabledTypes, props.analyzers])
    const sortedLineRows: IAnalyzerRow[] = useMemo(() => {
        const rowSortComparator = (a: IAnalyzerRow, b: IAnalyzerRow): number => {
            return (a.cols[sortColumn] < b.cols[sortColumn] ? -1 : 1) * (sortOrder === "asc" ? 1 : -1)
        }
        return mergedLineRows.sort(rowSortComparator)
    }, [mergedLineRows, sortColumn, sortOrder])
    
    const handleChangeCheckBox = (type: TAnalyzerResultType, checked: boolean) => {
        if (checked) {
            setDisabledTypes((disabledTypes) => disabledTypes.filter(t => t !== type))
        } else {
            setDisabledTypes((disabledTypes) => disabledTypes.concat(type))
        }
    }
    
    const handleToggleSortOrderFor = (column: number) => {
        setSortOrder(column === sortColumn ? (sortOrder === "asc" ? "desc" : "asc") : "asc")
        setSortColumn(column)
    }

    const AnalyzerRow = (props: { index: any, style: any, data: { autoWidth: number } }) => {
        const analyzerRow = sortedLineRows[props.index]
        const backgroundColor = typeColors[analyzerRow.cols[0] as keyof typeof typeColors]

        // Doesn't add up to 100% due to the scrollbar in the table body.
        // With 100% the headers and table body entries would be misaligned
        const categoryColWidth = (props.data.autoWidth / 100 * 15)
        const nameColWidth = (props.data.autoWidth / 100 * 20)
        const findingColWidth = (props.data.autoWidth / 100 * 60)

        return (
            <TableRow
                sx={{ width: (categoryColWidth + nameColWidth + findingColWidth), backgroundColor: backgroundColor }}
                style={props.style}
                component="div"
            >
                <TableCell
                    align="left"
                    sx={{ maxWidth: categoryColWidth, width: categoryColWidth}}
                    component="div"
                >
                    <AutoTooltip>
                        {analyzerRow.cols[0]}
                    </AutoTooltip>
                </TableCell>
                <TableCell
                    align="left"
                    sx={{ maxWidth: nameColWidth, width: nameColWidth }}
                    component="div"
                >
                    <AutoTooltip>
                        {analyzerRow.cols[1]}
                    </AutoTooltip>
                </TableCell>
                <TableCell
                    align="left"
                    sx={{ maxWidth: findingColWidth, width: findingColWidth }}
                    component="div"
                >
                    <AutoTooltip>
                        {analyzerRow.cols[2]}
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
                        {t("Analyzers")}
                    </Typography>
                    <React.Fragment>
                        {types.map((type, index) => {
                            const color = typeColors[type as keyof typeof typeColors]
                            return (
                                <React.Fragment key={type}>
                                    <Checkbox
                                        checked={disabledTypes.includes(type) === false}
                                        onChange={(e) => handleChangeCheckBox(type, e.target.checked)}
                                    /> <div style={{ backgroundColor: color }}>{`${type[0].toUpperCase()}${type.slice(1).toLowerCase()}`}</div>
                                </React.Fragment>
                            )
                        })} 
                    </React.Fragment>
                </Toolbar>
                <div style={{ height: "90%", width: "100%" }}>
                    <Table 
                        ref={contentTableRef}
                        sx={{ width: "100%", height: "90%" }}
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
                                    key="category"
                                    align="left"
                                    padding="normal"
                                    sortDirection={sortColumn === 0 ? sortOrder : false}
                                    component="div"
                                    sx={{width: "15%"}}
                                >
                                    <TableSortLabel
                                        active={sortColumn === 0}
                                        direction={sortColumn === 0 ? sortOrder : "asc"}
                                        onClick={() => handleToggleSortOrderFor(0)}
                                    >
                                        {t("Category")} 
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    key="name"
                                    align="left"
                                    padding="normal"
                                    sortDirection={sortColumn === 1 ? sortOrder : false}
                                    component="div"
                                    sx={{width: "20%"}}
                                >
                                    <TableSortLabel
                                        active={sortColumn === 1}
                                        direction={sortColumn === 1 ? sortOrder : "asc"}
                                        onClick={() => handleToggleSortOrderFor(1)}
                                    >
                                        {t("Name")}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell
                                    key="finding"
                                    align="left"
                                    padding="normal"
                                    sortDirection={sortColumn === 1 ? sortOrder : false}
                                    component="div"
                                    sx={{width: "65%"}}
                                >
                                    <TableSortLabel
                                        active={sortColumn === 1}
                                        direction={sortColumn === 1 ? sortOrder : "asc"}
                                        onClick={() => handleToggleSortOrderFor(2)}
                                    >
                                        {t("Finding")}
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
                                        itemCount={sortedLineRows.length}
                                        itemData={{ autoWidth: width }}
                                    >
                                        {AnalyzerRow}
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