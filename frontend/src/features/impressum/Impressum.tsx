import { TreeItem } from "@mui/lab"
import { useTranslation } from "react-i18next"

export const Impressum = () => {
    const { t } = useTranslation()
    return (
        <TreeItem nodeId="IMPRESSUM" label={t("Impressum")}>
        </TreeItem>
    )
}