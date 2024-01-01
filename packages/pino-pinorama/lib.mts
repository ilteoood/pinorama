import abstractTransport from "pino-abstract-transport"
import { PinoramaClient } from "pinorama-client"
import type { Transform } from "node:stream"

export type PinoramaTransportOptions = {
  url: string
  batchSize: number
  flushInterval: number
  maxRetries: number
  retryInterval: number
}

export default function pinoramaTransport(options: PinoramaTransportOptions) {
  const defaultOptions: PinoramaTransportOptions = {
    url: "http://localhost:6200",
    batchSize: 10,
    flushInterval: 5000,
    maxRetries: 5,
    retryInterval: 1000
  }

  const opts = { ...defaultOptions, ...options }

  const client = new PinoramaClient(opts)

  const buildFn = async (source: Transform) => {
    client.bulkInsert(source, {
      batchSize: opts.batchSize,
      flushInterval: opts.flushInterval
    })
  }

  const closeFn = async () => {
    // TODO: flush client buffer
  }

  return abstractTransport(buildFn, { close: closeFn })
}
