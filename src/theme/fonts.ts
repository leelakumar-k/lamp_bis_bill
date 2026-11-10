// Android and iOS ship system fonts covering every Indian script and the ₹ sign,
// so native builds use the platform font for the best rendering and no download.
export const fontFamily: string | undefined = undefined;

export function loadWebFonts() {}
