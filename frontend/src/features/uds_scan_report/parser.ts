export interface IStateGraphEdges {
    [startState: string]: string[]
}

export interface IStateGraphNode {
    [key: string]: string | number
}

export interface IStateGraphNodes {
    [state: string]: IStateGraphNode
}

export interface IStateGraph {
    edges: IStateGraphEdges
    nodes: IStateGraphNodes
    graphviz_source: string
}

export interface IPacketDescription {
    desc: string
    hex: string
    length: number
    fields: { [key: number]: IPacketField }
}

export interface IPacketDescriptions {
    [key: string]: IPacketDescription
}

export interface IPacketField {
    name: string
    repr: string
    type: string
    value: string | number
}

export interface IScanReport {
    testCases: TestCase[]
    stateGraph: IStateGraph
}

export interface ITestCaseResult {
    uid: number
    req: string
    req_ts: number
    state: string
    readableState: string
    resp: string | null
    resp_ts: number | null
    roundTripTime: number
}

interface IStateStatisticsJSON {
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
}

export interface IStateStatistics extends IStateStatisticsJSON {
    readableState: string
}

interface ITestCaseJSON {
    name: string
    completed: boolean
    results: ITestCaseResult[]
    states_completed: { [stateKey: string]: boolean }
    packet_desc: IPacketDescriptions
    state_graph: IStateGraph
    statistics: { [stateKey: string]: IStateStatisticsJSON }    // stateKey is either a state "s_N" or "all"
}

export const makeReadableStateNameFrom = (stateNode: IStateGraphNode): string => {
    return Object.keys(stateNode).map(k => {
        const v = stateNode[k]
        const kl = k.toUpperCase()
        return [kl.charAt(0).concat(kl.charAt(kl.length - 1)), v].join("=")
    }).join(" ")
}

export interface ICompletedState {
    readableState: string
    completed: boolean
}

export interface ICompletedStates {
    [stateKey: string]: ICompletedState
}

export class TestCase {
    name: string
    completed: boolean
    completedStates: ICompletedStates
    results: ITestCaseResult[]
    packetDescriptions: IPacketDescriptions
    stateStatistics: { [stateKey: string]: IStateStatistics }   // stateKey is either a state "s_N" or "all"

    constructor(obj: ITestCaseJSON, stateGraph: IStateGraph) {
        this.name = obj.name
        this.completed = obj.completed
        this.completedStates = Object.fromEntries(Object.entries(obj.states_completed).map(e => {
            const [k, v] = e
            return [k, { readableState: makeReadableStateNameFrom(stateGraph.nodes[k]), completed: v }]
        }))
        this.results = obj.results.map((e, i) => ({...e, 
            uid: i,
            roundTripTime: (e.resp_ts ?? e.req_ts) - e.req_ts,
            readableState: makeReadableStateNameFrom(stateGraph.nodes[e.state]),
        }))
        this.packetDescriptions = obj.packet_desc
        this.stateStatistics = Object.fromEntries(Object.entries(obj.statistics).map(e => {
            const [k, v] = e
            return [k, { ...v, readableState: stateGraph.nodes[k] !== undefined ? makeReadableStateNameFrom(stateGraph.nodes[k]) : `${k[0].toUpperCase()}${k.slice(1)}` }]
        }))
    }

    /*
    results_with_negative_response() {
        return this.results.filter(x => x.resp.startsWith("7f"));
    }

    results_with_positive_response() {
        return this.results.filter(x => !x.resp.startsWith("7f"))
    }

    results_without_response() {
        return this.results.filter(x => x.resp === null)
    }

    results_with_response() {
        return this.results.filter(x => x.resp !== null)
    }

    statistics() {
        function diff(x: TestCaseResult): number {
            return x.resp_ts - x.req_ts
        }

        function avg(nums: number[]): number {
            return nums.reduce((x, y) => x + y, 0) / nums.length
        }

        let answertimes = this.results_with_response().map(diff)
        let answertimes_nr = this.results_with_negative_response().map(diff)
        let answertimes_pr = this.results_with_positive_response().map(diff)

        const stats = {
            num_answered: this.results_with_response().length,
            num_unanswered: this.results_without_response().length,
            num_negative_resps: this.results_with_negative_response().length,
            num_positive_resps: this.results_with_positive_response().length,
            answertime_min: Math.min(...answertimes),
            answertime_min_nr: Math.min(...answertimes_nr),
            answertime_min_pr: Math.min(...answertimes_pr),
            answertime_max: Math.max(...answertimes),
            answertime_max_nr: Math.max(...answertimes_nr),
            answertime_max_pr: Math.max(...answertimes_pr),
            answertime_avg: avg(answertimes),
            answertime_avg_nr: avg(answertimes_nr),
            answertime_avg_pr: avg(answertimes_pr),
        }

        return stats
    }
    */
}

const injectReadableStateNamesIntoGraphvizSource = (source: string, stateGraphNodes: IStateGraphNodes): string => {
    // TODO: think about doing this in the backend (patching the "source" here is not really a good idea ...)
    let patchedSource = source
    Object.entries(stateGraphNodes).forEach(e => {
        const [k, v] = e
        patchedSource = patchedSource.replace(new RegExp(k, "g"), `"${makeReadableStateNameFrom(v)}"`)
    })
    return patchedSource
}

export function parseScanReport(data: any): IScanReport {
    const stableTestCaseArray = Object.values(data["test_cases"] as ITestCaseJSON[]).sort((a, b) => a.name < b.name ? -1 : 1)
    let stateGraph = data["state_graph"]
    stateGraph["graphviz_source"] = injectReadableStateNamesIntoGraphvizSource(stateGraph["graphviz_source"], stateGraph.nodes)
    const scanReport: IScanReport = {
        testCases: stableTestCaseArray.map(tc => new TestCase(tc as ITestCaseJSON, stateGraph)),
        stateGraph: stateGraph
    }
    return scanReport
}