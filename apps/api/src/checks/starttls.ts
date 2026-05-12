import net from "node:net";

export interface StartTlsReady {
  socket: net.Socket;
  transcript: string[];
}

export const prepareStartTls = async (host: string, port: number, mode: "smtp" | "imap" | "pop3", timeoutMs: number) => {
  const socket = net.connect({ host, port });
  socket.setTimeout(timeoutMs);
  const transcript: string[] = [];
  let buffer = "";

  const waitFor = (matcher: (line: string) => boolean) =>
    new Promise<string>((resolve, reject) => {
      const cleanup = () => {
        socket.off("data", onData);
        socket.off("error", onError);
        socket.off("timeout", onTimeout);
      };
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split(/\r?\n/).filter(Boolean);
        const hit = lines.find(matcher);
        if (hit) {
          transcript.push(...lines);
          buffer = "";
          cleanup();
          resolve(hit);
        }
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const onTimeout = () => {
        cleanup();
        reject(new Error("STARTTLS negotiation timed out."));
      };
      socket.on("data", onData);
      socket.on("error", onError);
      socket.on("timeout", onTimeout);
    });

  const write = (line: string) => socket.write(`${line}\r\n`);

  if (mode === "smtp") {
    await waitFor((line) => /^220/.test(line));
    write("EHLO certwatch.local");
    const ehlo = await waitFor((line) => /^250[\s-]STARTTLS/i.test(line) || /^250 /.test(line));
    if (!transcript.some((line) => /STARTTLS/i.test(line)) && !/STARTTLS/i.test(ehlo)) throw new Error("SMTP server does not advertise STARTTLS.");
    write("STARTTLS");
    await waitFor((line) => /^220/.test(line));
  }

  if (mode === "imap") {
    await waitFor((line) => /^\* OK/i.test(line));
    write("a001 CAPABILITY");
    await waitFor((line) => /^a001 OK/i.test(line));
    if (!transcript.some((line) => /STARTTLS/i.test(line))) throw new Error("IMAP server does not advertise STARTTLS.");
    write("a002 STARTTLS");
    await waitFor((line) => /^a002 OK/i.test(line));
  }

  if (mode === "pop3") {
    await waitFor((line) => /^\+OK/i.test(line));
    write("CAPA");
    await waitFor((line) => /^\./.test(line));
    if (!transcript.some((line) => /STLS/i.test(line))) throw new Error("POP3 server does not advertise STLS.");
    write("STLS");
    await waitFor((line) => /^\+OK/i.test(line));
  }

  socket.removeAllListeners("data");
  return { socket, transcript } satisfies StartTlsReady;
};
