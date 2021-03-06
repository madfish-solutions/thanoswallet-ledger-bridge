import Transport from "@ledgerhq/hw-transport";
import U2FTransport from "@ledgerhq/hw-transport-u2f";
import WebSocketTransport from "@ledgerhq/hw-transport-http/lib/WebSocketTransport";

// URL which triggers Ledger Live app to open and handle communication
const BRIDGE_URL = "ws://localhost:8435";

// Number of seconds to poll for Ledger Live and Ethereum app opening
const TRANSPORT_CHECK_DELAY = 1000;
const TRANSPORT_CHECK_LIMIT = 120;

export async function exchange(
  apdu: string,
  scrambleKey?: string,
  exchangeTimeout?: number,
  useLedgerLive?: boolean
) {
  const t = await getOrCreateTransport(useLedgerLive);
  if (exchangeTimeout) t.setExchangeTimeout(exchangeTimeout);
  if (scrambleKey) t.setScrambleKey(scrambleKey);
  const resultBuf = await t.exchange(Buffer.from(apdu, "hex"));
  return resultBuf.toString("hex");
}

let transport: Transport;
async function getOrCreateTransport(useLedgerLive?: boolean) {
  if (transport) {
    if (useLedgerLive) {
      try {
        await WebSocketTransport.check(BRIDGE_URL);
        return transport;
      } catch (_err) {}
    } else {
      return transport;
    }
  }

  if (useLedgerLive) {
    try {
      await WebSocketTransport.check(BRIDGE_URL);
    } catch (_err) {
      window.open("ledgerlive://bridge?appName=Tezos Wallet");
      await checkLedgerLiveTransport();
    }

    transport = await WebSocketTransport.open(BRIDGE_URL);
  } else {
    transport = await U2FTransport.create();
  }
  return transport;
}

async function checkLedgerLiveTransport(i = 0) {
  return WebSocketTransport.check(BRIDGE_URL).catch(async () => {
    await new Promise((r) => setTimeout(r, TRANSPORT_CHECK_DELAY));
    if (i < TRANSPORT_CHECK_LIMIT) {
      return checkLedgerLiveTransport(i + 1);
    } else {
      throw new Error("Ledger transport check timeout");
    }
  });
}
