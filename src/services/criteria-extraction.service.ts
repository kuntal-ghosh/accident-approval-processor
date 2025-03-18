import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
// import { ChatCohere } from "@langchain/cohere";
// import { BaseChatModel } from "@langchain/core/language_models/chat_models";
interface AccidentReport {
  rcf_details: Record<string, any>;
  approval_status: "Approved" | "Not Approved"| "NIL" ;
}

export class AccidentCriteriaExtractor {
  private llm: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;
  private chunkSize = 2; // Default chunk size
  
  constructor(apiKey: string, chunkSize?: number) {
    this.llm = new ChatOpenAI({ 
      openAIApiKey: apiKey, 
      temperature: 0,
      modelName: "gpt-4o" 
    });
    // this.llm = new ChatAnthropic({
    //   anthropicApiKey: apiKey,
    //   modelName:"claude-3-haiku-20240307"
    // });
    this.embeddings = new OpenAIEmbeddings({ openAIApiKey: apiKey });
    
    if (chunkSize) {
      this.chunkSize = chunkSize;
    }
  }
  
  /**
   * Split an array into chunks of specified size
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
      console.log("🚀 ~ AccidentCriteriaExtractor ~ chunks:", chunks.length)
    return chunks;
  }
  
  /**
   * Process a single chunk of reports
   */
  private async processChunk(
    approvedChunk: AccidentReport[],
    notApprovedChunk: AccidentReport[]
  ): Promise<string> {
    const promptTemplate = PromptTemplate.fromTemplate(`
      You are an accident analysis expert working with traffic police data.
      
      I have accident reports that are either approved or not approved.
      Please analyze these samples and extract the clear criteria that determines
      whether an accident gets approved or not.
      
      Here are examples of APPROVED accident reports:
      {approvedReports}
      
      Here are examples of NOT APPROVED accident reports:
      {notApprovedReports}
      
      Based on the data, please:
      1. Identify key factors that influence approval
      2. List specific criteria that seem to determine approval status
      3. Explain the reasoning behind each criterion
      4. Format your response as a structured list of criteria
    `);
    
    const chain = new LLMChain({ llm: this.llm, prompt: promptTemplate });
    
    const result = await chain.call({
      approvedReports: JSON.stringify(approvedChunk, null, 2),
      notApprovedReports: JSON.stringify(notApprovedChunk, null, 2)
    });
    
    return result.text;
  }
  
  /**
   * Summarize all the criteria extracted from different chunks
   */
  private async summarizeCriteria(criteriaList: string[]): Promise<string> {
    const summaryPrompt = PromptTemplate.fromTemplate(`
      You are an accident analysis expert working with traffic police data.
      
      Below are multiple analyses of accident approval criteria, each based on different samples:
      
      {criteriaList}
      
      Please consolidate these analyses into one comprehensive set of criteria for accident approval.
      In your consolidated response:
      1. Identify the most consistent factors across all analyses
      2. List clear criteria for accident approval
      3. Note any contradictions or edge cases
      4. Format your response as a well-structured list of definitive criteria
    `);
    
    const chain = new LLMChain({ llm: this.llm, prompt: summaryPrompt });
    
    const result = await chain.call({
      criteriaList: criteriaList.join("\n\n=== NEXT ANALYSIS ===\n\n")
    });
    
    return result.text;
  }
  
  async extractCriteria(reports: AccidentReport[]): Promise<string> {
    // Separate approved and not approved reports
    const approvedReports = reports.filter(
      report => report.approval_status.includes("Approve")
    );
    console.log("🚀 ~ AccidentCriteriaExtractor ~ extractCriteria ~ approvedReports:", approvedReports.length)
    
    const notApprovedReports = reports.filter(
      report => report.approval_status.includes("Not Approve")
    );
    console.log("🚀 ~ AccidentCriteriaExtractor ~ extractCriteria ~ notApprovedReports:", notApprovedReports.length)
    
    // Chunk the reports
    const approvedChunks = this.chunkArray(approvedReports, this.chunkSize);
    console.log("🚀 ~ AccidentCriteriaExtractor ~ extractCriteria ~ approvedChunks:", approvedChunks.length)
    const notApprovedChunks = this.chunkArray(notApprovedReports, this.chunkSize);
    console.log("🚀 ~ AccidentCriteriaExtractor ~ extractCriteria ~ notApprovedChunks:", notApprovedChunks.length)
    
    // Determine how many chunks to process
    const maxChunksToProcess = Math.min(
      approvedChunks.length,
      Math.ceil(notApprovedChunks.length / 3) // Process more not approved chunks since we have more of them
    );
    
    console.log(`Processing ${maxChunksToProcess} chunks of approved reports and ${Math.min(maxChunksToProcess * 3, notApprovedChunks.length)} chunks of not approved reports`);
    
    // Process chunks and collect results
    const criteriaResults: string[] = [];
    
    for (let i = 0; i < maxChunksToProcess; i++) {
      const approvedChunk = approvedChunks[i] || [];
      
      // For not approved, take 3 chunks for every 1 approved chunk (to balance the dataset)
      const notApprovedChunkStart = i * 3;
      const notApprovedSubChunks = notApprovedChunks.slice(
        notApprovedChunkStart, 
        Math.min(notApprovedChunkStart + 3, notApprovedChunks.length)
      );
      
      // Flatten the not approved sub-chunks
      const notApprovedChunk = notApprovedSubChunks.flat().slice(0, this.chunkSize * 3);
      
      console.log(`Processing chunk ${i+1}/${maxChunksToProcess}: ${approvedChunk.length} approved and ${notApprovedChunk.length} not approved reports`);
      
      const chunkResult = await this.processChunk(approvedChunk, notApprovedChunk);
      criteriaResults.push(chunkResult);
    }
      console.log("🚀 ~ AccidentCriteriaExtractor ~ extractCriteria ~ criteriaResults:", criteriaResults)
    
    // Summarize all the criteria
    const finalSummary = await this.summarizeCriteria(criteriaResults);
    
    return finalSummary;
  }
}