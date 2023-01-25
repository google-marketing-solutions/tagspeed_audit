type LHResponse = {
    blockedURL: string;
    scores: {
      LCP: number;
      FCP: number;
      CLS: number;
      consoleErrors: number;
    };
    error?: string;
  };

  