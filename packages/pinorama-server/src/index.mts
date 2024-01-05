import fs from "node:fs"
import url from "node:url"
import path from "node:path"
import os from "node:os"
import Fastify from "fastify"
import FastifyAutoload from "@fastify/autoload"
import fp from "fastify-plugin"
import { create } from "@orama/orama"
import {
  persistToFile,
  restoreFromFile
} from "@orama/plugin-data-persistence/server"

import type {
  FastifyPluginAsync,
  FastifyRegisterOptions,
  FastifyServerOptions,
  LogLevel,
  RegisterOptions
} from "fastify"
import type { AnyOrama, AnySchema } from "@orama/orama"

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

declare module "fastify" {
  interface FastifyInstance {
    pinoramaDb: AnyOrama
    pinoramaOpts: PinoramaServerOptions
  }
}

type PersistenceFormat = "json" | "dpack" | "binary" // orama does not export this type

type PinoramaServerOptions = {
  dbSchema?: AnySchema
  dbPath?: string
  dbFormat?: PersistenceFormat
  prefix?: string
  logLevel?: LogLevel
}

export const defaultOptions: PinoramaServerOptions = {
  dbPath: path.join(os.tmpdir(), "pinorama.msp"),
  dbSchema: {
    level: "number",
    time: "number",
    msg: "string",
    pid: "number",
    hostname: "string"
  }
}

const fastifyPinoramaServer: FastifyPluginAsync<PinoramaServerOptions> = async (
  fastify,
  options
) => {
  const opts = { ...defaultOptions, ...options }

  const db = fs.existsSync(opts.dbPath as string)
    ? await restoreFromFile("json", opts.dbPath)
    : await create({ schema: opts.dbSchema })

  fastify.decorate("pinoramaOpts", opts)
  fastify.decorate("pinoramaDb", db)

  const registerOpts: RegisterOptions = {}

  if (opts.prefix) {
    registerOpts.prefix = opts.prefix
  }

  if (opts.logLevel) {
    registerOpts.logLevel = opts.logLevel
  }

  fastify.register(FastifyAutoload, {
    dir: path.join(__dirname, "routes"),
    options: registerOpts
  })

  fastify.register(FastifyAutoload, {
    dir: path.join(__dirname, "hooks"),
    options: registerOpts
  })

  fastify.addHook("onClose", async (req) => {
    try {
      const savedPath = await persistToFile(
        fastify.pinoramaDb,
        fastify.pinoramaOpts.dbFormat,
        fastify.pinoramaOpts.dbPath
      )
      req.log.info(`database saved to ${savedPath}`)
    } catch (error) {
      req.log.error(`failed to save database: ${error}`)
    }
  })
}

function createServer(
  pinoramaOptions: FastifyRegisterOptions<PinoramaServerOptions>,
  fastifyOptions?: FastifyServerOptions
) {
  const fastify = Fastify(fastifyOptions)
  fastify.register(fastifyPinoramaServer, pinoramaOptions)
  return fastify
}

const plugin = fp(fastifyPinoramaServer, {
  fastify: "4.x",
  name: "fastify-pinorama-server"
})

export default plugin
export { fastifyPinoramaServer, createServer }
