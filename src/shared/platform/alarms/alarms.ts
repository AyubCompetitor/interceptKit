/** Replaces an earlier alarm with the same name; the browser fires it 30 seconds from now at the earliest */
export const scheduleAlarm = async (name: string, when: number): Promise<void> => {
    await chrome.alarms.create(name, { when });
};

export const clearAlarm = async (name: string): Promise<void> => {
    await chrome.alarms.clear(name);
};

/** Calls listener each time the alarm goes off, even when it woke the background for it */
export const watchAlarm = (name: string, listener: VoidFunction): VoidFunction => {
    const onAlarm = (alarm: chrome.alarms.Alarm) => {
        if (alarm.name !== name) {
            return;
        }

        listener();
    };

    chrome.alarms.onAlarm.addListener(onAlarm);

    return () => chrome.alarms.onAlarm.removeListener(onAlarm);
};
