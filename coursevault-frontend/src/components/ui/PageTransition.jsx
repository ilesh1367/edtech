import React from 'react';

export default function PageTransition({ children }) {
  // Simply return the page content with no framer-motion animations
  return (
    <>
      {children}
    </>
  );
}