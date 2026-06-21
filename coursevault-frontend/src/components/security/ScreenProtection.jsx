import React from 'react';

export default function ScreenProtection({ children }) {
  // 🚧 SECURITY TEMPORARILY DISABLED FOR DEBUGGING
  // This component acts as a transparent wrapper so you can use 
  // Right-Click, Inspect Element, and Screenshots freely.
  
  return (
    <>
      {children}
    </>
  );
}