import type pino from "pino";
import {inject, injectable} from "tsyringe";
import IEventHandler from '../base/IEventHandler.ts';
import IEvent from '../base/IEvent.ts';
import {NostrEvent} from '@nostrify/nostrify';
import {getParams, getTag} from "../../utils/nostrEventUtils.ts";
import { Address } from '@welshman/util';
import {WatchRepositoryCommand} from "../commands/WatchRepositoryCommand.ts";
import type ICommandHandler from "../base/ICommandHandler.ts";
import {CloneRepositoryCommand} from "../commands/CloneRepositoryCommand.ts";
import {DockerBuildCommand} from "../commands/DockerBuildCommand.ts";
import {UploadToBlossomCommand} from "../commands/UploadToBlossomCommand.ts";

export class DockerBuildRequestedEvent implements IEvent {
    nostrEvent!: NostrEvent;
}

@injectable()
export class DockerBuildRequestedEventHandler implements IEventHandler<DockerBuildRequestedEvent> {

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(CloneRepositoryCommand.name) private cloneRepositoryCommandHandler: ICommandHandler<CloneRepositoryCommand>,
        @inject(DockerBuildCommand.name) private dockerBuildCommandHandler: ICommandHandler<DockerBuildCommand>,
        @inject(UploadToBlossomCommand.name) private UploadToBlossomCommandHandler: ICommandHandler<UploadToBlossomCommand>,
    ) {
    }

    async execute(event: DockerBuildRequestedEvent): Promise<void> {
        console.log(event.nostrEvent)
        // TODO: validation
        const params = getParams(event.nostrEvent);

        const branchName = params.get("branch_name")
        const commitHash = params.get("commit_hash")
        if (commitHash === undefined || branchName === undefined) {
            console.log("missing parameter commit_hash");
            return;
        }

        try {
            const iTag = getTag(event.nostrEvent, "i");
            const repoAddress = Address.fromNaddr(iTag[1]);

            const dir = `tmp/${repoAddress.toNaddr()}-${commitHash}`;

            // Clone commit into tmp folder
            await this.cloneRepositoryCommandHandler.execute({cloneDir: dir, repoAddress: repoAddress, commitHash: commitHash})

            // Execute docker build
            const imageTag = `${repoAddress.identifier}-${commitHash}`
            await this.dockerBuildCommandHandler.execute({
                workDir: dir,
                outputImageDir: 'tmp/images',
                dockerfilePath: ".",
                imageTag: imageTag
            })

            // TODO: error handling

            // Write output to blossom
            await this.UploadToBlossomCommandHandler.execute({
                filePath: `tmp/images/${imageTag}.tar`
            })

        } catch (e){
            console.log(e)
            this.logger.error(e, "error when Building")
        }
    }
}