import React from "react";
import { styled } from "@mui/material/styles";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  IconButton,
  tableCellClasses,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

// Interface for a single data entry used in the table
interface DataEntry {
  time: string;
  flags: string;
  identifier: string;
  length: number;
  reserved: number;
  data: string;
  type: string;
}

// Interface for the props expected by the ResultsTable component
interface ResultsTableProps {
  data: DataEntry[]; // Array of data entries to display
  onClose: () => void; // Function to call when the close button is clicked
}

// Custom styled TableCell component for table headers
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.primary.dark, // Set the background color for header cells
    color: theme.palette.common.white, // Set the text color for header cells
    fontWeight: "bold", // Make header cell text bold
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14, // Set font size for body cells
  },
}));

// Custom styled TableRow component for zebra striping
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.action.hover, // Set the background color for odd rows
  },
  "&:last-child td, &:last-child th": {
    border: 0, // Remove border from the last row
  },
}));

// The ResultsTable component that displays a table of data entries
const ResultsTable: React.FC<ResultsTableProps> = ({ data, onClose }) => {
  return (
    // Box component to hold the table and provide styling
    <Box
      sx={{
        position: "absolute", // Position absolutely within the parent container
        right: 0, // Align to the right edge of the parent container
        top: 0, // Align to the top of the parent container
        bottom: 0, // Align to the bottom of the parent container
        width: "70%", // Take up 70% of the width of the parent container
        maxHeight: "100vh", // Set the maximum height to 100% of the viewport height
        overflowY: "auto", // Enable vertical scrolling if the content overflows
        zIndex: "modal", // Set z-index to ensure the table is above other content
      }}
    >
      {/* IconButton for closing the table, calls the onClose prop when clicked */}
      <IconButton
        onClick={onClose}
        sx={{
          position: "absolute", // Position absolutely within the Box
          top: 8, // Offset from the top
          right: 8, // Offset from the right
          zIndex: "tooltip", // Set z-index to ensure the button is above other content
        }}
      >
        <CloseIcon />
      </IconButton>

      {/* TableContainer with Paper component as the base */}
      <TableContainer
        component={Paper}
        sx={{ maxHeight: 550, overflowY: "auto" }}
      >
        <Table stickyHeader aria-label="sticky table">
          {/* TableHead defines the header row of the table */}
          <TableHead>
            <StyledTableRow>
              {/* Header cells using the StyledTableCell for custom styles */}
              <StyledTableCell>Time</StyledTableCell>
              <StyledTableCell>Flags</StyledTableCell>
              <StyledTableCell>Identifier</StyledTableCell>
              <StyledTableCell>Length</StyledTableCell>
              <StyledTableCell>Reserved</StyledTableCell>
              <StyledTableCell>Data</StyledTableCell>
              <StyledTableCell>Type</StyledTableCell>
            </StyledTableRow>
          </TableHead>
          {/* TableBody contains all the data rows, mapped from the data prop */}
          <TableBody>
            {data.map((row, index) => (
              <StyledTableRow key={index}>
                {/* Data cells also use the StyledTableCell for custom styles */}
                <StyledTableCell>{row.time}</StyledTableCell>
                <StyledTableCell>{row.flags}</StyledTableCell>
                <StyledTableCell>{row.identifier}</StyledTableCell>
                <StyledTableCell>{row.length}</StyledTableCell>
                <StyledTableCell>{row.reserved}</StyledTableCell>
                <StyledTableCell>{row.data}</StyledTableCell>
                <StyledTableCell>{row.type}</StyledTableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ResultsTable; // Export the component for use in other parts of the application
