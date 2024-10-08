import {inject, injectable} from "tsyringe";
import type pino from "pino";
import {NRelay, NSecSigner} from '@nostrify/nostrify';
import {RelayProvider} from "../RelayProvider.ts";
import type IRelayProvider from "../IRelayProvider.ts";
import {nostrNow} from "../utils/nostrEventUtils.ts";

export interface IEventPublisher {
    publish(kind: number, tags: string[][], content: string): Promise<void>
}


@injectable()
export class EventPublisher implements IEventPublisher {

    private relay: NRelay;
    private logger: pino.Logger;

    constructor(
        @inject("Logger") logger: pino.Logger,
        @inject(RelayProvider.name) relayProvider: IRelayProvider,
    ) {
        this.logger = logger;
        this.relay = relayProvider.getDefaultPool();

    }

    public async publish(kind: number, tags: string[][], content: string): Promise<void> {
        const secretKey: string = Deno.env.get("NSEC_HEX") || ""; // TODO throw new Error("NSEC_HEX env var not set");
        const signer = new NSecSigner(secretKey);
        const signerPubkey = await signer.getPublicKey();

        var note = {
            kind: kind,
            pubkey: signerPubkey,
            content: content,
            created_at: nostrNow(),
            tags: tags
        }
        const envt = await signer.signEvent(note);

        await this.relay.event(envt)
    }
}