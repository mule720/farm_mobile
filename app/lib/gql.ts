/**
 * All GraphQL operations for the FarmPulse mobile app.
 */
import { gql } from '@apollo/client';

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      token
      refreshToken
      user { id username email fullName role organization { id name } }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($phone: String!, $email: String, $password: String!, $fullName: String!, $organizationName: String!, $role: String) {
    register(input: { phone: $phone, email: $email, password: $password, fullName: $fullName, organizationName: $organizationName, role: $role }) {
      token
      refreshToken
      user { id email fullName role phone organization { id name } }
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) { token refreshToken }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me { id username email fullName role phone avatarUrl organization { id name plan } }
  }
`;

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
export const DASHBOARD_SUMMARY_QUERY = gql`
  query DashboardSummary {
    dashboardSummary {
      totalRevenue totalCosts grossProfit activeBatches totalAnimals
      mortalityRate avgFcr inventoryAlerts pendingTasks
    }
    dashboardAlerts(limit: 10) { id title message severity createdAt }
    dashboardTrend { label revenue cost profit }
  }
`;

// ── ENTERPRISES & BATCHES ─────────────────────────────────────────────────────
export const ENTERPRISES_QUERY = gql`
  query Enterprises {
    enterprises(isActive: true) {
      id name enterpriseType area areaUnit
      activeBatches { id name status currentCount mortalityCount startDate ageInDays avgWeightKg }
    }
  }
`;

export const BATCHES_QUERY = gql`
  query Batches($enterpriseId: ID, $status: String) {
    batches(enterpriseId: $enterpriseId, status: $status) {
      id name status initialCount currentCount mortalityCount
      avgWeightKg targetWeightKg feedConsumedKg waterConsumedL
      startDate ageInDays totalCosts projectedRevenue
      enterprise { id name enterpriseType }
    }
  }
`;

export const CREATE_BATCH_MUTATION = gql`
  mutation CreateBatch($enterpriseId: ID!, $name: String!, $initialCount: Int!, $startDate: Date!, $targetWeightKg: Float) {
    createBatch(enterpriseId: $enterpriseId, name: $name, initialCount: $initialCount, startDate: $startDate, targetWeightKg: $targetWeightKg) {
      batch { id name status initialCount startDate }
    }
  }
`;

// ── PRODUCTION RECORDS ────────────────────────────────────────────────────────
export const PRODUCTION_RECORDS_QUERY = gql`
  query ProductionRecords($enterpriseId: ID, $batchId: ID, $limit: Int) {
    productionRecords(enterpriseId: $enterpriseId, batchId: $batchId, limit: $limit) {
      id recordType recordDate data
      batch { id name } enterprise { id name }
    }
  }
`;

export const CREATE_PRODUCTION_RECORD_MUTATION = gql`
  mutation CreateProductionRecord($enterpriseId: ID!, $batchId: ID, $recordType: String, $recordDate: Date!, $data: JSONString!) {
    createProductionRecord(input: { enterpriseId: $enterpriseId, batchId: $batchId, recordType: $recordType, recordDate: $recordDate, data: $data }) {
      record { id recordType recordDate data }
      wasUpdated
    }
  }
`;

export const UPDATE_PRODUCTION_RECORD_MUTATION = gql`
  mutation UpdateProductionRecord($id: ID!, $data: JSONString!) {
    updateProductionRecord(id: $id, data: $data) {
      record { id recordType recordDate data }
    }
  }
`;

// ── INVENTORY ─────────────────────────────────────────────────────────────────
export const INVENTORY_QUERY = gql`
  query Inventory($category: String, $enterpriseId: ID, $lowStockOnly: Boolean) {
    inventoryItems(category: $category, enterpriseId: $enterpriseId, lowStockOnly: $lowStockOnly) {
      id name category unit currentStock reorderLevel costPerUnit supplier isLowStock
      enterprise { id name }
    }
    inventorySummary { totalItems lowStockItems totalValue categories }
  }
`;

export const RECORD_INVENTORY_TRANSACTION_MUTATION = gql`
  mutation RecordTransaction($itemId: ID!, $transactionType: String!, $quantity: Float!, $notes: String, $batchId: ID) {
    recordTransaction(itemId: $itemId, transactionType: $transactionType, quantity: $quantity, notes: $notes, batchId: $batchId) {
      transaction { id transactionType quantity createdAt }
    }
  }
`;

export const CREATE_INVENTORY_ITEM_MUTATION = gql`
  mutation CreateInventoryItem($enterpriseId: ID, $name: String!, $category: String!, $unit: String!, $currentStock: Float!, $reorderLevel: Float!, $costPerUnit: Float!, $supplier: String) {
    createInventoryItem(enterpriseId: $enterpriseId, name: $name, category: $category, unit: $unit, currentStock: $currentStock, reorderLevel: $reorderLevel, costPerUnit: $costPerUnit, supplier: $supplier) {
      item { id name category currentStock }
    }
  }
`;

// ── FINANCIALS ────────────────────────────────────────────────────────────────
export const BATCH_FINANCIALS_QUERY = gql`
  query BatchFinancials($enterpriseId: ID) {
    batches(enterpriseId: $enterpriseId) {
      id name totalCosts totalRevenue grossProfit roiPct profitMarginPct
      startDate endDate status enterprise { id name }
    }
  }
`;

// ── MARKET ────────────────────────────────────────────────────────────────────
export const COMMODITY_PRICES_QUERY = gql`
  query CommodityPrices {
    commodityPrices {
      id commodity marketName unit price currency priceDate source
    }
    latestPrices { id commodity marketName unit price currency priceDate }
  }
`;

export const MARKET_LISTINGS_QUERY = gql`
  query MarketListings {
    marketListings {
      id title commodity quantity unit pricePerUnit currency status
      description location contactPhone createdAt
      organization { id name }
    }
    myListings {
      id title commodity quantity unit pricePerUnit currency status createdAt
    }
  }
`;

export const CREATE_LISTING_MUTATION = gql`
  mutation CreateListing($title: String!, $commodity: String!, $quantity: Float!, $unit: String!, $pricePerUnit: Float!, $currency: String, $description: String, $location: String, $contactPhone: String) {
    createListing(title: $title, commodity: $commodity, quantity: $quantity, unit: $unit, pricePerUnit: $pricePerUnit, currency: $currency, description: $description, location: $location, contactPhone: $contactPhone) {
      listing { id title status createdAt }
    }
  }
`;

export const ADD_COMMODITY_PRICE_MUTATION = gql`
  mutation AddCommodityPrice($commodity: String!, $marketName: String!, $unit: String!, $price: Float!, $currency: String, $priceDate: Date!, $source: String) {
    addCommodityPrice(commodity: $commodity, marketName: $marketName, unit: $unit, price: $price, currency: $currency, priceDate: $priceDate, source: $source) {
      price { id commodity price priceDate }
    }
  }
`;

export const BUYER_PROFILES_QUERY = gql`
  query BuyerProfiles {
    buyerProfiles {
      id name buyerType contactPerson phone email town commoditiesWanted preferredVolumeKg isVerified rating
    }
  }
`;

// ── AI VISION ─────────────────────────────────────────────────────────────────
export const ANALYZE_IMAGE_MUTATION = gql`
  mutation AnalyzeImage($analysisType: String!, $imageUrl: String!, $userDescription: String, $enterpriseId: ID, $batchId: ID, $isPublic: Boolean) {
    analyzeImage(analysisType: $analysisType, imageUrl: $imageUrl, userDescription: $userDescription, enterpriseId: $enterpriseId, batchId: $batchId, isPublic: $isPublic) {
      analysis {
        id analysisType diagnosis severity confidencePct findings recommendations aiSummary
        enterprise { id name } batch { id name }
      }
    }
  }
`;

export const VISION_ANALYSES_QUERY = gql`
  query VisionAnalyses($enterpriseId: ID, $limit: Int) {
    visionAnalyses(enterpriseId: $enterpriseId, limit: $limit) {
      id analysisType diagnosis severity confidencePct aiSummary imageUrl createdAt
      enterprise { id name }
    }
  }
`;

// ── COMMUNITY / FARMER REPORTS ────────────────────────────────────────────────
export const COMMUNITY_REPORTS_QUERY = gql`
  query CommunityReports($limit: Int) {
    communityReports(limit: $limit) {
      id title description location cropOrLivestock status helpfulCount
      hasAiAnalysis aiDiagnosis aiRecommendations createdAt
      submittedBy { id fullName }
    }
  }
`;

export const SUBMIT_FARMER_REPORT_MUTATION = gql`
  mutation SubmitFarmerReport($title: String!, $description: String!, $cropOrLivestock: String, $location: String, $imageUrl: String, $isPublic: Boolean, $runAiAnalysis: Boolean) {
    submitFarmerReport(title: $title, description: $description, cropOrLivestock: $cropOrLivestock, location: $location, imageUrl: $imageUrl, isPublic: $isPublic, runAiAnalysis: $runAiAnalysis) {
      report { id title status hasAiAnalysis aiDiagnosis aiRecommendations }
    }
  }
`;

export const MARK_REPORT_HELPFUL_MUTATION = gql`
  mutation MarkReportHelpful($reportId: ID!) {
    markReportHelpful(reportId: $reportId) { ok helpfulCount }
  }
`;

// ── AI RECOMMENDATIONS ────────────────────────────────────────────────────────
export const RECOMMENDATIONS_QUERY = gql`
  query Recommendations($enterpriseId: ID, $limit: Int) {
    recommendations(enterpriseId: $enterpriseId, limit: $limit) {
      id title detail recommendationType urgency impact isActioned generatedAt expiresAt
      enterprise { id name }
    }
    intelligenceSummary { totalActive criticalCount feedingAlerts healthAlerts }
  }
`;

export const ACTION_RECOMMENDATION_MUTATION = gql`
  mutation ActionRecommendation($id: ID!) {
    actionRecommendation(id: $id) { ok }
  }
`;

// ── WEATHER ───────────────────────────────────────────────────────────────────
export const WEATHER_QUERY = gql`
  query Weather {
    weatherForecasts {
      id forecastDate condition minTempC maxTempC rainProbabilityPct farmingAdvisory
    }
    weatherReadings(limit: 24) {
      id temperatureC humidityPct windSpeedKph rainfallMm pressureHpa uvIndex recordedAt
    }
  }
`;

// ── LABOR / TASKS ─────────────────────────────────────────────────────────────
export const TASKS_QUERY = gql`
  query Tasks($status: String) {
    tasks(status: $status) {
      id title description status priority dueDate
      assignedTo { id fullName }
      enterprise { id name }
    }
    myTasks(status: $status) { id title status priority dueDate }
  }
`;

export const CREATE_TASK_MUTATION = gql`
  mutation CreateTask($title: String!, $description: String, $priority: String, $dueDate: Date, $enterpriseId: ID, $assignedToId: ID) {
    createTask(title: $title, description: $description, priority: $priority, dueDate: $dueDate, enterpriseId: $enterpriseId, assignedToId: $assignedToId) {
      task { id title status }
    }
  }
`;

export const MEMBERS_QUERY = gql`
  query Members {
    members(isActive: true) { id fullName email role phone avatarUrl isActive }
  }
`;

// ── INVITE USER ───────────────────────────────────────────────────────────────
export const INVITE_USER_MUTATION = gql`
  mutation InviteUser($fullName: String!, $phone: String!, $role: String!, $email: String, $password: String) {
    inviteUser(input: { fullName: $fullName, phone: $phone, role: $role, email: $email, password: $password }) {
      profile { id fullName email phone role isActive }
      tempPassword
    }
  }
`;

// ── REPORTS / ANALYSIS ────────────────────────────────────────────────────────
export const REPORTS_QUERY = gql`
  query Reports($reportType: String, $status: String) {
    reports(reportType: $reportType, status: $status) {
      id name reportType status outputFormat fileUrl dateFrom dateTo generatedAt
      enterprise { id name }
      generatedBy { id fullName }
    }
  }
`;

export const CREATE_REPORT_MUTATION = gql`
  mutation CreateReport($name: String!, $reportType: String!, $enterpriseId: ID, $dateFrom: Date, $dateTo: Date, $outputFormat: String, $parameters: JSONString) {
    createReport(input: { name: $name, reportType: $reportType, enterpriseId: $enterpriseId, dateFrom: $dateFrom, dateTo: $dateTo, outputFormat: $outputFormat, parameters: $parameters }) {
      report { id name reportType status outputFormat fileUrl generatedAt }
    }
  }
`;
