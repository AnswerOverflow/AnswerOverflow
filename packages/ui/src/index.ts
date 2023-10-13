import React from 'react';
import type { ServerWithFlags } from '@answeroverflow/db';
// Suppress warning about useLayoutEffect on the server

if (typeof window === 'undefined') React.useLayoutEffect = () => {};
