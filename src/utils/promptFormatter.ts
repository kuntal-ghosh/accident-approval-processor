export function formatPrompt(data: {
    approveStatus: string;
    contributoryFactors: string;
    reporterName: string;
    accidentSeverity: string;
    location: string;
}): string {
    return `
    Approval Decision Request:
    - Approval Status: ${data.approveStatus}
    - Contributory Factors: ${data.contributoryFactors}
    - Reporter: ${data.reporterName}
    - Accident Severity: ${data.accidentSeverity}
    - Location: ${data.location}

    Please evaluate the above details and provide an approval decision.
    `;
}