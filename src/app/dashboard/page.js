"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { getApiUrl } from "../../config/api";
import { mapToDashboardViewModel } from "../../models/DashboardViewModel";
import "./dashboard.css";

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch(getApiUrl('/api/dashboard-summary'));
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const data = await response.json();
        // Map API response to view model
        const viewModel = mapToDashboardViewModel(data?.data);
        setDashboardData(viewModel.dashboardData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        console.error("Error fetching dashboard data:", err);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="dashboard-error">Error: {error}</div>;
  }

return (
    <div className="dashboard-container">
        <header className="dashboard-header">
            <h1>Accident Approval Prediction Dashboard</h1>
            <div className="dashboard-nav">
                <Link href="/reports">
                    <button className="nav-button">Reports List</button>
                </Link>
                <Link href="/criteria">
                    <button className="nav-button">Approval Criteria</button>
                </Link>
                <Link href="/prediction-accuracy">
                    <button className="nav-button">Prediction Accuracy</button>
                </Link>
                {/* <Link href="/confusion-matrix">
                    <button className="nav-button">
                        Confusion Matrix
                    </button>
                </Link> */}
            </div>
        </header>
        
        <div className="dashboard-summary">
            <div className="summary-card total-reports">
                <h2>Total Reports</h2>
                <div className="card-value">{dashboardData?.totalReports || 0}</div>
            </div>
            <div className="summary-card total-reports">
                <h2>Predicted Reports</h2>
                <div className="card-value">{dashboardData?.predictionResults || 0}</div>
            </div>
            <div className="summary-card pending-approval">
                <h2>Pending Prediction</h2>
                <div className="card-value">{dashboardData?.pendingApproval || 0}</div>
            </div>
            <div className="summary-card approved">
                <h2>Approved</h2>
                <div className="card-value">{dashboardData?.approved || 0}</div>
            </div>
            <div className="summary-card rejected">
                <h2>Rejected</h2>
                <div className="card-value">{dashboardData?.rejected || 0}</div>
            </div>
        </div>

        <div className="">
            <div className="accuracy-card">
                <h2>Prediction Accuracy : {dashboardData?.predictionStats?.accuracyPercentage}</h2>
                <div className="accuracy-description" style={{color: "red"}}>
                    Based on {dashboardData?.predictionResults || 0} total predictions
                </div>
            </div>
        </div>
        <div className="dashboard-charts">
            <div className="chart-container">
                <h2>Recent Predictions</h2>
                {dashboardData?.recentActivity?.length > 0 ? (
                    <table className="recent-activity-table" style={{ width: "100%" }}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Report ID</th>
                                <th style={{ textAlign: "center" }}>Prediction</th>
                                <th style={{ textAlign: "center" }}>Actual Status</th>
                                <th style={{ textAlign: "center" }}>Accuracy</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dashboardData.recentActivity.map((activity, index) => (
                                <tr key={index}>
                                    <td className="activity-date">{new Date(activity.date).toLocaleDateString()}</td>
                                    <td className="report-id">{activity.reportId}</td>
                                    <td className="prediction" style={{ textAlign: "center" }}>
                                        <span className={`status-pill prediction-${activity.prediction.toLowerCase()}`}>{activity.prediction}</span>
                                    </td>
                                    <td className="actual-status" style={{ textAlign: "center" }}>
                                        <span className={`status-pill status-${activity.status.toLowerCase()}`}>{activity.status}</span>
                                    </td>
                                    <td className="accuracy-indicator" style={{ textAlign: "center" }}>
                                        {activity.isCorrect ? <span className="correct-prediction">✓</span> : <span className="incorrect-prediction">✗</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No recent predictions</p>
                )}
            </div>
        </div>
    </div>
);
}
