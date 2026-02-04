let lastEventReceivedTime = Date.now();

export const recordEventReceived = (): void => {
	lastEventReceivedTime = Date.now();
};

export const getLastEventReceivedTime = (): number => {
	return lastEventReceivedTime;
};
