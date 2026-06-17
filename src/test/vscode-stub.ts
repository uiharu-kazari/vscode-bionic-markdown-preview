// Minimal stand-in for the `vscode` module so non-UI source can be unit tested
// outside the Extension Host. Only what the tested modules touch is provided.
export const Uri = {
  joinPath: (...args: unknown[]) => args.join('/'),
};
export const window = {};
export const workspace = {};
export const commands = {};
export const ViewColumn = { Active: 1, Beside: 2 };
