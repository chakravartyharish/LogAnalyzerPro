import { useAppSelector } from '../../app/hooks';
import {
    selectBackendEvents,
} from './BackendEventSlice';
import { useTranslation } from 'react-i18next';
import TreeItem from "@mui/lab/TreeItem";

import "./BackendEvent.css"

export const BackendEvents = () => {
    const backendEvents = useAppSelector(selectBackendEvents)
    
    const { t } = useTranslation()

    const hwInterfaceTreeItems = backendEvents.map((backendEvent) => {
        const treeNodeId = `BACKENDEVENT::${backendEvent.id}`
        return (
            <TreeItem
                className={'backendEvent_' + backendEvent.level}
                key={backendEvent.id}
                nodeId={treeNodeId}
                label={backendEvent.unique_identifier}
            />
        )
    })

    return (
        <TreeItem nodeId="BACKENDEVENT" label={t("Backend Events")}>
            {hwInterfaceTreeItems}
        </TreeItem>
    )
}
