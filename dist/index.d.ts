interface LokaliseExchangeConfig {
    projectId: string;
}

declare class LokaliseFileExchange {
    protected readonly projectId: string;
    constructor(exchangeConfig: LokaliseExchangeConfig);
}

declare class LokaliseDownload extends LokaliseFileExchange {
}

declare class LokaliseUpload extends LokaliseFileExchange {
}

export { LokaliseDownload, LokaliseUpload };
