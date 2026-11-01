# Sourced public guidance

**SitecoreAI Search** retrieves and semantically ranks candidates from the native **Liberty Mutual Approved Answers** source. The application renders authored guidance and its citations; it does not generate insurance advice.

Question searches add a conservative support check in `question-evidence.ts`. Every substantive subject term must occur in one candidate's authored title, question, answer text, or applicability metadata. Small product/word-form aliases preserve common phrases such as car/auto and combine/bundle. This prevents common words such as insurance or policy from turning an unsupported subject into a convincing result list. It is a lexical support check, not a native confidence score, a semantic model, or a coverage determination.

If no candidate addresses the question, the interface asks the visitor to refine the question or contact an agent and carries the question into that handoff. Ordinary keyword browsing retains the native ranking. New published guidance can support new subjects without adding query exceptions or deploying new application code.

The approved-answer publication contract is bounded to 100 direct items. The UI retrieves those ranked candidates, applies question support checks, and pages the displayed results in groups of six. An index with more than 100 candidates asks the visitor to narrow the query. Search events reflect the displayed result set, and loading a new query hides the previous query's cards.

Sitecore documents semantic reranking as relevance ordering, rather than a comparable numeric confidence score. A future generated-answer experience can add a separately calibrated embedding relevance gate and grounded generation. It should preserve the authored source, refusal path, and citation boundary. See [native Search settings](https://doc.sitecore.com/sai/en/users/sitecoreai/design-components/search-experiences/understanding-search-sources/advanced-settings.html) and [Sitecore's retrieval and relevance guidance](https://developers.sitecore.com/learn/accelerate/sitecoreai/implementation/sitecore-search/search-ai-agents-and-rag#gate-relevance-with-a-separate-embedding-model).
