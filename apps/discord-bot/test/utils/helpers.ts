// Bit of a hack of a helper function to give async tasks that aren't tracked time to run. A better approach would be to listen to dispatched events
export async function delay(timeout: number = 100) {
  await new Promise((resolve) => setTimeout(resolve, timeout));
}
