type LHResponse = {
    blockedURL: string;
    reportUrl: string;
    scores: {
      LCP: number;
      FCP: number;
      CLS: number;
      consoleErrors: number;
    };
    error?: string;
  };

  