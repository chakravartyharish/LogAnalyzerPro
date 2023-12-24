import { useEffect, useState } from "react"
import Box from "@mui/material/Box"
import Container from "@mui/material/Container"

// NOTE: run "'utils/make compile_licenses_file' and 'frontend/make collect_licenses_file'" to generate the "all_licenses.txt" file in the frontend/public folder

export const ExternalLicenses = () => {
   
    const [licensesText, selectLicensesText] = useState("")
    
    useEffect(() => {
        fetch(`${process.env.PUBLIC_URL}/all_licenses.txt`, { method: "GET" } )
            .then((response) => response.text())
            .then((text) => {
                selectLicensesText(text)
            })
    }, [])

    return (
        <Container id={"external-licenses-container"} sx={{ whiteSpace: "pre-line",
                                                            fontSize: 10,
                                                            overflow: "hidden",
                                                            overflowY: "auto" }}>
            <Box component="div">
                {licensesText}
            </Box>
        </Container>
    )
}