from __future__ import annotations

import gzip
import itertools
import json
import pathlib

from typing import Dict, Any, List, cast, Optional, Callable, Tuple, ValuesView, Set  # noqa: F401
from types import GeneratorType
from six import string_types

from scanner.models import UDSScanRun, UDSScanRunFinding


class EcuState(object):
    __slots__ = ["__dict__", "__cache__"]

    def __init__(self, **kwargs):
        # type: (Any) -> None
        self.__cache__ = None  # type: Optional[Tuple[List[EcuState], ValuesView[Any]]]  # noqa: E501
        for k, v in kwargs.items():
            if isinstance(v, GeneratorType):
                v = list(v)
            self.__setitem__(k, v)

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in self.__dict__.items()}

    def _expand(self):
        # type: () -> List[EcuState]
        if self.__cache__ is None or \
                self.__cache__[1] != self.__dict__.values():
            expanded = list()
            for x in itertools.product(
                    *[self._flatten(v) for v in self.__dict__.values()]):
                kwargs = {}
                for i, k in enumerate(self.__dict__.keys()):
                    if x[i] is None:
                        continue
                    kwargs[k] = x[i]
                expanded.append(EcuState(**kwargs))
            self.__cache__ = (expanded, self.__dict__.values())
        return self.__cache__[0]

    @staticmethod
    def _flatten(x):
        # type: (Any) -> List[Any]
        if isinstance(x, (string_types, bytes)):
            return [x]
        elif hasattr(x, "__iter__") and hasattr(x, "__len__") and len(x) == 1:
            return list(*x)
        elif not hasattr(x, "__iter__"):
            return [x]
        flattened = list()
        for y in x:
            if hasattr(x, "__iter__"):
                flattened += EcuState._flatten(y)
            else:
                flattened += [y]
        return flattened

    def __delitem__(self, key):
        # type: (str) -> None
        self.__cache__ = None
        del self.__dict__[key]

    def __len__(self):
        # type: () -> int
        return len(self.__dict__.keys())

    def __getitem__(self, item):
        # type: (str) -> Any
        return self.__dict__[item]

    def __setitem__(self, key, value):
        # type: (str, Any) -> None
        self.__cache__ = None
        self.__dict__[key] = value

    def __repr__(self):
        # type: () -> str
        return "".join(str(k) + str(v) for k, v in
                       sorted(self.__dict__.items(), key=lambda t: t[0]))

    def __eq__(self, other):
        # type: (object) -> bool
        other = cast(EcuState, other)
        if len(self.__dict__) != len(other.__dict__):
            return False
        try:
            return all(self.__dict__[k] == other.__dict__[k]
                       for k in self.__dict__.keys())
        except KeyError:
            return False

    def __contains__(self, item):
        # type: (EcuState) -> bool
        if not isinstance(item, EcuState):
            return False
        return all(s in self._expand() for s in item._expand())

    def __ne__(self, other):
        # type: (object) -> bool
        return not other == self

    def __lt__(self, other):
        # type: (EcuState) -> bool
        if self == other:
            return False

        if len(self) < len(other):
            return True

        if len(self) > len(other):
            return False

        common = set(self.__dict__.keys()).intersection(
            set(other.__dict__.keys()))

        for k in sorted(common):
            if not isinstance(other.__dict__[k], type(self.__dict__[k])):
                raise TypeError(
                    "Can't compare %s with %s for the EcuState element %s" %
                    (type(self.__dict__[k]), type(other.__dict__[k]), k))
            if self.__dict__[k] < other.__dict__[k]:
                return True
            if self.__dict__[k] > other.__dict__[k]:
                return False

        if len(common) < len(self.__dict__):
            self_diffs = set(self.__dict__.keys()).difference(
                set(other.__dict__.keys()))
            other_diffs = set(other.__dict__.keys()).difference(
                set(self.__dict__.keys()))

            for s, o in zip(self_diffs, other_diffs):
                if s < o:
                    return True

            return False

        raise TypeError("EcuStates should be identical. Something bad happen. "
                        "self: %s other: %s" % (self.__dict__, other.__dict__))

    def __hash__(self):
        # type: () -> int
        return hash(repr(self))


class StateGraph(object):
    def __init__(self,
                 nodes: Optional[Dict[str, Dict[str, Any]]] = None,
                 edges: Optional[Dict[str, List[str]]] = None,
                 **kwargs: Dict[str, Any]) -> None:
        if nodes is None or edges is None:
            return
        self.idx_nodes = {k: EcuState(**v) for k, v in nodes.items()}
        self.edges = {self.idx_nodes[k]: [self.idx_nodes[v] for v in edges[k]] for k in edges.keys()}
        self.nodes = list(itertools.chain.from_iterable(self.edges.values()))

    def get_node_from_label(self, label: str) -> EcuState:
        return self.idx_nodes[label]


class Result(object):
    def __init__(self,
                 pkt_resolver: Callable[[str], Dict[str, Any]],
                 state_graph: StateGraph,
                 state: str = "",
                 req: str = "",
                 resp: Optional[str] = None,
                 req_ts: float = 0.0,
                 resp_ts: Optional[float] = None) -> None:
        self.state = state_graph.get_node_from_label(state)
        self.req: Dict[str, Any] = pkt_resolver(req)
        self.resp: Optional[Dict[str, Any]] = None if resp is None else pkt_resolver(resp)
        self.req_ts = req_ts
        self.resp_ts = resp_ts


class TestCase(object):
    def __init__(self,
                 state_graph: StateGraph,
                 name: str = "",
                 completed: bool = False,
                 states_completed: Optional[Dict[str, bool]] = None,
                 scanned_states: Optional[List[str]] = None,
                 results: Optional[List[Dict[str, Any]]] = None,
                 packet_desc: Optional[Dict[str, Dict[str, Any]]] = None,
                 statistics: Optional[Dict[str, Dict[str, str]]] = None) -> None:
        if states_completed is None or scanned_states is None or packet_desc is None \
                or results is None or statistics is None:
            return
        self.name = name
        self.completed = completed
        self.states_completed = {state_graph.get_node_from_label(k): v for k, v in states_completed.items()}
        self.scanned_states = [state_graph.get_node_from_label(k) for k in scanned_states]
        self.packet_desc = packet_desc
        self.results = [Result(self.get_packet_from_label, state_graph, **result) for result in results]
        self.statistics = {
            state_graph.get_node_from_label(k) if k in state_graph.idx_nodes.keys() else k:
                v for k, v in statistics.items()
        }

    def get_packet_from_label(self, label: str) -> Dict[str, Any]:
        return self.packet_desc[label]


class Finding(object):
    def __init__(self, path: pathlib.Path) -> None:
        with path.open("rb") as file:
            data = gzip.decompress(file.read())
            jdata = json.loads(data.decode("utf-8"))

        self.state_graph = StateGraph(**jdata["state_graph"])
        self.test_cases = {k: TestCase(self.state_graph, **v) for k, v in jdata["test_cases"].items()}


class ResultList(List[Result]):
    @property
    def responses(self) -> List[Dict[str, Any]]:
        return [r.resp for r in self if r.resp is not None]

    @property
    def requests(self) -> List[Dict[str, Any]]:
        return [r.req for r in self]

    @property
    def positive_responses(self) -> List[Dict[str, Any]]:
        return [r for r in self.responses if not r["hex"].startswith("7f")]

    @property
    def negative_responses(self) -> List[Dict[str, Any]]:
        return [r for r in self.responses if r["hex"].startswith("7f")]

    @property
    def results_with_positive_response(self) -> ResultList:
        return ResultList(r for r in self if r.resp is not None and not r.resp["hex"].startswith("7f"))

    @property
    def results_with_negative_response(self) -> ResultList:
        return self.get_results_by_response_service(0x7f)

    def get_results_by_request_service(self, service_id: int) -> ResultList:
        return ResultList(r for r in self if r.req["hex"].startswith(hex(service_id)))

    def get_results_by_response_service(self, service_id: int) -> ResultList:
        return ResultList(r for r in self if r.resp is not None and r.resp["hex"].startswith(hex(service_id)))


class Findings(object):
    def __init__(self, scan_run: UDSScanRun) -> None:
        findings = UDSScanRunFinding.objects.filter(scan_run=scan_run.id)
        self.findings = [Finding(f.results_file) for f in findings]

    def get_states(self) -> Set[EcuState]:
        return set(list(itertools.chain.from_iterable(
            [finding.state_graph.nodes for finding in self.findings])))

    def get_states_of_interest(self) -> List[EcuState]:
        states = self.get_states()
        states_of_interest = list()

        sessions = [s.session for s in states if s.session > 1]  # type: ignore
        for ses in sessions:
            try:
                temp_states = [s for s in states if s.session == ses]  # type: ignore
                states_of_interest.append(max(temp_states))
            except ValueError:
                pass

        if not states_of_interest:
            if not states:
                return []
            states_of_interest.append(max(states))
        return states_of_interest

    def get_testcases(self) -> List[str]:
        return list(set(itertools.chain.from_iterable(
            [finding.test_cases.keys() for finding in self.findings])))

    def get_testcases_as_objects(self) -> List[TestCase]:
        return list(set(itertools.chain.from_iterable(
            [finding.test_cases.values() for finding in self.findings])))

    def get_results(self) -> ResultList:
        return ResultList(itertools.chain.from_iterable(
            [self.get_results_of_testcase(tc) for tc in self.get_testcases()]))

    def get_results_of_testcase(self, test_case_name: str) -> ResultList:
        return ResultList(itertools.chain.from_iterable([
            finding.test_cases[test_case_name].results
            for finding in self.findings
            if test_case_name in finding.test_cases.keys()]))
