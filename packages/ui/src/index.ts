import React from 'react';

// Suppress warning about useLayoutEffect on the server

if (typeof window === 'undefined') React.useLayoutEffect = () => {};
