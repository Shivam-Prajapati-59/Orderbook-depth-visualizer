export async function readResponseJson(response: Response): Promise<unknown> {
    const text = await response.text();
    const trimmed = text.trim();
    if (trimmed.length === 0) {
        return null;
    }
    return JSON.parse(trimmed) as unknown;
}