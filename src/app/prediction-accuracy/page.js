"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { getApiUrl } from "../../config/api";
import "./prediction-accuracy.css";

export default function PredictionAccuracy() {
    const [matrixData, setMatrixData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [metrics, setMetrics] = useState({});
    const [accuracyData, setAccuracyData] = useState(null);
    const [timeframe, setTimeframe] = useState("week"); // week or month

    useEffect(() => {
        const fetchAccuracyData = async () => {
          try {
            setLoading(true);
            const response = await fetch(getApiUrl(`/api/prediction-accuracy?timeframe=${timeframe}`));
            if (!response.ok) {
              throw new Error('Failed to fetch prediction accuracy data');
            }
            const data = await response.json();
            setAccuracyData(data);
            setLoading(false);
          } catch (err) {
            setError(err.message);
            setLoading(false);
            console.error("Error fetching prediction accuracy data:", err);
          }
        };
    
        fetchAccuracyData();
      }, [timeframe]);
    
    
  useEffect(() => {
    const fetchMatrixData = async () => {
      try {
        setLoading(true);
        const response = await fetch(getApiUrl("/api/confusion-matrix"));
        if (!response.ok) {
          throw new Error('Failed to fetch confusion matrix data');
        }
        const data = await response.json();
        setMatrixData(data);
        
        // Calculate metrics
        if (data.data && data.data.matrix && data.data.labels) {
          setMetrics(calculateMetrics(data.data.matrix, data.data.labels));
        }
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        console.error("Error fetching confusion matrix data:", err);
      }
    };

    fetchMatrixData();
  }, []);

  const calculateMetrics = (matrix, labels) => {
    // For a multi-class confusion matrix
    const result = {};
    
    // Calculate metrics for each class
    labels.forEach((label, i) => {
      const classMetrics = {};
      
      // Calculate true positives, false positives, false negatives
      let tp = 0;
      let fp = 0;
      let fn = 0;
      
      for (let actualIdx = 0; actualIdx < matrix.length; actualIdx++) {
        for (let predictedIdx = 0; predictedIdx < matrix[actualIdx].length; predictedIdx++) {
          if (predictedIdx === i && actualIdx === i) {
            tp += matrix[actualIdx][predictedIdx];
          } else if (predictedIdx === i) {
            fp += matrix[actualIdx][predictedIdx];
          } else if (actualIdx === i) {
            fn += matrix[actualIdx][predictedIdx];
          }
        }
      }
      
      // Calculate precision, recall, and F1 score
      const precision = tp / (tp + fp) || 0;
      const recall = tp / (tp + fn) || 0;
      const f1 = 2 * ((precision * recall) / (precision + recall)) || 0;
      
      classMetrics.precision = precision;
      classMetrics.recall = recall;
      classMetrics.f1 = f1;
      
      result[label] = classMetrics;
    });
    
    return result;
  };

  const getMaxValue = () => {
    if (!matrixData?.data?.matrix) return 1;
    return Math.max(...matrixData.data.matrix.flat());
  };

  const getCellColor = (value) => {
    const maxValue = getMaxValue();
    const intensity = value / maxValue;
    
    // Using a blue color scale with intensity
    return `rgba(0, 123, 255, ${Math.max(0.1, intensity)})`;
  };

  if (loading) {
    return <div className="matrix-loading">Loading confusion matrix data...</div>;
  }

  if (error) {
    return <div className="matrix-error">Error: {error}</div>;
  }


  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
  };

  if (loading) {
    return <div className="accuracy-loading">Loading prediction accuracy data...</div>;
  }

  if (error) {
    return <div className="accuracy-error">Error: {error}</div>;
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="prediction-accuracy-container">
      <header className="accuracy-header">
        <h1>Prediction Accuracy Analysis</h1>
        <div className="accuracy-nav">
          <Link href="/dashboard">
            <button className="nav-button">Back to Dashboard</button>
          </Link>
        </div>
      </header>

      <div className="timeframe-selector">
        <button 
          className={`timeframe-button ${timeframe === 'week' ? 'active' : ''}`}
          onClick={() => handleTimeframeChange('week')}
        >
          Weekly
        </button>
        <button 
          className={`timeframe-button ${timeframe === 'month' ? 'active' : ''}`}
          onClick={() => handleTimeframeChange('month')}
        >
          Monthly
        </button>
      </div>

      <div className="accuracy-summary">
        <div className="summary-card accuracy">
          <h2>Overall Accuracy</h2>
          <div className="card-value">{accuracyData?.data?.overall?.accuracy_percentage || 0}%</div>
          <div className="card-subtitle">
            {accuracyData?.data?.overall?.correct_predictions || 0} correct out of {accuracyData?.data?.overall?.total_predictions || 0} predictions
          </div>
        </div>
        <div className="summary-card precision">
          <h2>Precision</h2>
          <div className="card-value">{accuracyData?.data?.overall?.precision_percentage || 0}%</div>
          <div className="card-subtitle">
            True Positives: {accuracyData?.data?.overall?.true_positives || 0}
          </div>
        </div>
        <div className="summary-card recall">
          <h2>Recall</h2>
          <div className="card-value">{accuracyData?.data?.overall?.recall_percentage || 0}%</div>
          <div className="card-subtitle">
            False Negatives: {accuracyData?.data?.overall?.false_negatives || 0}
          </div>
        </div>
        <div className="summary-card f1">
          <h2>F1 Score</h2>
          <div className="card-value">{accuracyData?.data?.overall?.f1_score || 0}</div>
          <div className="card-subtitle">
            Balance of precision and recall
          </div>
        </div>
      </div>

      <div className="accuracy-visualizations">
        <div className="chart-container">
          {/* <h2>Accuracy Trend Over Time</h2>
          <div className="trend-chart">
            {accuracyData?.data?.trend && accuracyData.data.trend.length > 0 ? (
              <div className="chart-bars">
                {accuracyData.data.trend.map((item, index) => (
                  <div key={index} className="trend-bar-container">
                    <div className="trend-date">{formatDate(item.prediction_date)}</div>
                    <div 
                      className="trend-bar"
                      style={{
                        height: `${Math.max(item.accuracy_percentage, 5)}%`,
                        backgroundColor: getBarColor(item.accuracy_percentage)
                      }}
                    >
                      <div className="trend-bar-value">{item.accuracy_percentage}%</div>
                    </div>
                    <div className="trend-count">
                      {item.correct_predictions}/{item.total_predictions}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No trend data available for this timeframe</p>
            )}
          </div> */}
           <h2>Confusion Matrix</h2>
        <div className="matrix-container">
          <div className="matrix-labels">
            <div className="matrix-axis-label">Actual</div>
            <div className="matrix-axis-label horizontal">Predicted</div>
          </div>
          <table className="matrix-table">
            <thead>
              <tr>
                <th></th>
                <th>Positive</th>
                <th>Negative</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="row-header">Positive</td>
                <td className="true-positive">{accuracyData?.data?.overall?.true_positives || 0}</td>
                <td className="false-negative">{accuracyData?.data?.overall?.false_negatives || 0}</td>
              </tr>
              <tr>
                <td className="row-header">Negative</td>
                <td className="false-positive">{accuracyData?.data?.overall?.false_positives || 0}</td>
                <td className="true-negative">{accuracyData?.data?.overall?.true_negatives || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>

        <div className="chart-container">
          <h2>Accuracy by Criteria Version</h2>
          <div className="criteria-chart">
            {accuracyData?.data?.byCriteria && accuracyData.data.byCriteria.length > 0 ? (
              <table className="criteria-table">
                <thead>
                  <tr>
                    <th>Criteria Version</th>
                    <th>Predictions</th>
                    <th>Correct</th>
                    <th>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {accuracyData.data.byCriteria.map((criteria, index) => (
                    <tr key={index}>
                      <td>Version {criteria.version}</td>
                      <td>{criteria.total_predictions}</td>
                      <td>{criteria.correct_predictions}</td>
                      <td>
                        <div className="criteria-accuracy-bar-container">
                          <div 
                            className="criteria-accuracy-bar"
                            style={{
                              width: `${criteria.accuracy_percentage}%`,
                              backgroundColor: getBarColor(criteria.accuracy_percentage)
                            }}
                          ></div>
                          <span>{criteria.accuracy_percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No criteria data available</p>
            )}
          </div>
        </div>
      </div>
      <div className="matrix-metrics">
        <h2>Performance Metrics</h2>
        
        <div className="metrics-grid">
          {Object.entries(metrics).map(([label, metric]) => (
            <div key={label} className="metric-card">
              <h3>{label}</h3>
              <div className="metric-values">
                <div className="metric-item">
                  <span className="metric-label">Precision:</span>
                  <span className="metric-value">{(metric.precision * 100).toFixed(2)}%</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Recall:</span>
                  <span className="metric-value">{(metric.recall * 100).toFixed(2)}%</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">F1 Score:</span>
                  <span className="metric-value">{metric.f1.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="matrix-interpretations">
        <h2>Interpretations</h2>
        
        <div className="interpretation-cards">
          <div className="interpretation-card">
            <h3>True Positives</h3>
            <p>Correctly predicted positive cases (diagonal cells)</p>
          </div>
          <div className="interpretation-card">
            <h3>False Positives</h3>
            <p>Incorrectly predicted as positive (off-diagonal cells in columns)</p>
          </div>
          <div className="interpretation-card">
            <h3>False Negatives</h3>
            <p>Incorrectly predicted as negative (off-diagonal cells in rows)</p>
          </div>
        </div>
      </div>
      <div className="accuracy-metadata">
        <p>Data calculated at: {accuracyData?.metadata?.calculatedAt ? new Date(accuracyData.metadata.calculatedAt).toLocaleString() : 'Unknown'}</p>
        <p>Timeframe: {accuracyData?.metadata?.timeframe || timeframe}</p>
      </div>
    </div>
  );
}

function getBarColor(percentage) {
  if (percentage >= 80) return '#4CAF50'; // Green
  if (percentage >= 60) return '#8BC34A'; // Light Green
  if (percentage >= 40) return '#FFC107'; // Yellow
  if (percentage >= 20) return '#FF9800'; // Orange
  return '#F44336'; // Red
}
