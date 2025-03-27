"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import "../page.css";
import "./criteria.css";
import { getApiUrl } from "../../config/api";

export default function Criteria() {
  const [criteria, setCriteria] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCriteria = async () => {
      try {
        setLoading(true);
        const response = await fetch(getApiUrl('/api/criteria/active'));
        if (!response.ok) {
          throw new Error('Failed to fetch criteria');
        }
        const data = await response.json();
        setCriteria(data);
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };

    fetchCriteria();
  }, []);

  // Function to render markdown-like text with proper formatting
  const renderFormattedText = (text) => {
    if (!text) return null;
    
    // Split the text by line breaks to handle paragraphs
    return text.split('\n').map((line, lineIndex) => {
      // Handle headers
      if (line.startsWith('###')) {
        return <h3 key={lineIndex}>{line.replace('###', '').trim()}</h3>;
      } else if (line.startsWith('####')) {
        return <h4 key={lineIndex}>{line.replace('####', '').trim()}</h4>;
      } else if (line.startsWith('-')) {
        // Handle list items
        const listContent = line.replace('-', '').trim();
        return (
          <li key={lineIndex}>
            {listContent.split(/\*\*(.*?)\*\*/).map((part, i) => {
              // Handle bold text inside list items
              return i % 2 === 1 ? <strong key={i}>{part}</strong> : part;
            })}
          </li>
        );
      } else if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || 
                line.startsWith('4.') || line.startsWith('5.') || line.startsWith('6.') || 
                line.startsWith('7.')) {
        // Handle numbered list items
        const listContent = line.replace(/^\d+\./, '').trim();
        return (
          <div className="numbered-item" key={lineIndex}>
            {listContent.split(/\*\*(.*?)\*\*/).map((part, i) => {
              // Handle bold text inside numbered items
              return i % 2 === 1 ? <strong key={i}>{part}</strong> : part;
            })}
          </div>
        );
      } else if (line.trim() === '') {
        // Handle empty lines
        return <br key={lineIndex} />;
      } else {
        // Handle regular paragraphs
        return (
          <p key={lineIndex}>
            {line.split(/\*\*(.*?)\*\*/).map((part, i) => {
              // Handle bold text in paragraphs
              return i % 2 === 1 ? <strong key={i}>{part}</strong> : part;
            })}
          </p>
        );
      }
    });
  };

  return (
    <div className="criteria-container">
      <div className="criteria-header">
        <Link href="/" className="back-button">← Back to Reports</Link>
        <h1 style={{marginBottom:"10px"}}>Accident Approval Criteria</h1>
        <p>
          This document outlines the criteria used to evaluate and approve accident reports.
        </p>
      </div>

      {loading && <p className="loading">Loading criteria...</p>}
      {error && <p className="error">Error: {error}</p>}
      
      {criteria && (
        <div className="criteria-content">
          <div className="criteria-meta">
            <p><strong>Version:</strong> {criteria.version}</p>
            <p><strong>Created:</strong> {new Date(criteria.createdAt).toLocaleDateString()}</p>
            <p><strong>Description:</strong> {criteria.description}</p>
          </div>
          
          <div className="criteria-details">
            {renderFormattedText(criteria.criteria)}
          </div>
        </div>
      )}
    </div>
  );
}
