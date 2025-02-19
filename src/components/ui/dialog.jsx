import * as React from "react";
import { styled } from "@mui/material/styles";
import {
  Dialog as MuiDialog,
  DialogTitle as MuiDialogTitle,
  DialogContent as MuiDialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import { cn } from "../../lib/utils";

const StyledDialog = styled(MuiDialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    maxWidth: "32rem",
    width: "100%",
    margin: theme.spacing(2),
  },
}));

const Dialog = ({ children, open, onClose, ...props }) => (
  <StyledDialog open={open} onClose={onClose} {...props}>
    {children}
  </StyledDialog>
);

const StyledDialogContent = styled(MuiDialogContent)(({ theme }) => ({
  padding: theme.spacing(2),
  paddingTop: theme.spacing(1),
  "&:first-of-type": {
    paddingTop: theme.spacing(2),
  },
}));

const DialogContent = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <StyledDialogContent ref={ref} className={className} {...props}>
      {children}
      <IconButton
        aria-label="close"
        onClick={props.onClose}
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
        }}
      >
        <CloseIcon />
      </IconButton>
    </StyledDialogContent>
  )
);
DialogContent.displayName = "DialogContent";

const StyledDialogHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1.5),
  textAlign: "center",
  [theme.breakpoints.up("sm")]: {
    textAlign: "left",
  },
}));

const DialogHeader = ({ className, ...props }) => (
  <StyledDialogHeader className={className} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const StyledDialogFooter = styled(DialogActions)(({ theme }) => ({
  display: "flex",
  flexDirection: "column-reverse",
  padding: theme.spacing(2),
  [theme.breakpoints.up("sm")]: {
    flexDirection: "row",
    justifyContent: "flex-end",
    "& > :not(:first-of-type)": {
      marginLeft: theme.spacing(1),
    },
  },
}));

const DialogFooter = ({ className, ...props }) => (
  <StyledDialogFooter className={className} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const StyledDialogTitle = styled(MuiDialogTitle)(({ theme }) => ({
  fontSize: theme.typography.h6.fontSize,
  fontWeight: theme.typography.fontWeightSemibold,
  lineHeight: 1,
  letterSpacing: "-0.01em",
  padding: 0,
}));

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <StyledDialogTitle ref={ref} className={className} {...props} />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <Typography
    ref={ref}
    variant="body2"
    color="text.secondary"
    className={className}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
