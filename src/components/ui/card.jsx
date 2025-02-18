import * as React from "react";
import { styled } from "@mui/material/styles";
import MuiCard from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

const StyledCard = styled(MuiCard)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: theme.shadows[1],
}));

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <StyledCard ref={ref} className={className} {...props} />
));
Card.displayName = "Card";

const StyledCardHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1.5),
  padding: theme.spacing(3),
}));

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <StyledCardHeader ref={ref} className={className} {...props} />
));
CardHeader.displayName = "CardHeader";

const StyledCardTitle = styled(Typography)(({ theme }) => ({
  fontSize: theme.typography.h6.fontSize,
  fontWeight: theme.typography.fontWeightSemibold,
  lineHeight: 1,
  letterSpacing: "-0.01em",
}));

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <StyledCardTitle ref={ref} variant="h6" className={className} {...props} />
));
CardTitle.displayName = "CardTitle";

const StyledCardDescription = styled(Typography)(({ theme }) => ({
  fontSize: theme.typography.body2.fontSize,
  color: theme.palette.text.secondary,
}));

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <StyledCardDescription
    ref={ref}
    variant="body2"
    className={className}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const StyledCardContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  paddingTop: 0,
}));

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <StyledCardContent ref={ref} className={className} {...props} />
));
CardContent.displayName = "CardContent";

const StyledCardFooter = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(3),
  paddingTop: 0,
}));

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <StyledCardFooter ref={ref} className={className} {...props} />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
