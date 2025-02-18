import * as React from "react";
import { styled } from "@mui/material/styles";
import { Tabs as MuiTabs, Tab as MuiTab, Box } from "@mui/material";

const StyledTabs = styled(MuiTabs)(({ theme }) => ({
  minHeight: 40,
  backgroundColor: theme.palette.action.selected,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(0.5),
  "& .MuiTabs-indicator": {
    display: "none",
  },
}));

const StyledTab = styled(MuiTab)(({ theme }) => ({
  minHeight: 32,
  padding: theme.spacing(0.75, 1.5),
  borderRadius: theme.shape.borderRadius,
  fontSize: theme.typography.body2.fontSize,
  fontWeight: theme.typography.fontWeightMedium,
  textTransform: "none",
  color: theme.palette.text.secondary,
  "&.Mui-selected": {
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[1],
  },
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  "&.Mui-disabled": {
    opacity: 0.5,
    pointerEvents: "none",
  },
}));

const TabPanel = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  "&:focus": {
    outline: "none",
    ring: `2px solid ${theme.palette.primary.main}`,
    ringOffset: "2px",
  },
}));

const Tabs = ({ value, onChange, children, ...props }) => (
  <StyledTabs value={value} onChange={onChange} {...props}>
    {children}
  </StyledTabs>
);

const TabsList = React.forwardRef(({ children, ...props }, ref) => (
  <Box ref={ref} {...props}>
    {children}
  </Box>
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef(({ value, children, ...props }, ref) => (
  <StyledTab ref={ref} value={value} label={children} {...props} />
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef(({ value, children, ...props }, ref) => (
  <TabPanel
    ref={ref}
    role="tabpanel"
    hidden={value !== props.tabValue}
    {...props}
  >
    {children}
  </TabPanel>
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
