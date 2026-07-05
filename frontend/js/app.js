import { auth } from './auth.js';

const API_URL = "http://127.0.0.1:5000/api";

// Fetch pending pickups from backend to render on Rider Dashboard
async function loadAvailableJobs() {
    try {
        const response = await fetch(`${API_URL}/orders`);
        const result = await response.json();
        
        if (result.success) {
            renderRiderPool(result.data);
        }
    } catch (error) {
        console.error("Error communicating with Python backend:", error);
    }
}

// Accept a specific trip run
async function claimDeliveryTask(orderId, riderId) {
    try {
        const response = await fetch(`${API_URL}/orders/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, riderId })
        });
        const result = await response.json();
        if (result.success) {
            alert("Job accepted! Contact details unlocked.");
            loadAvailableJobs(); // Refresh views
        }
    } catch (error) {
        console.error("Failed to accept delivery:", error);
    }
}

function renderRiderPool(jobs) {
    const container = document.getElementById("rider-workspace");
    if (!container) return;

    if (jobs.length === 0) {
        container.innerHTML = `<div class="card empty-state"><p>No pending food collections right now.</p></div>`;
        return;
    }

    container.innerHTML = jobs.map(job => `
        <div class="card" style="margin-bottom: 1rem;">
            <h3>${job.itemName}</h3>
            <p style="color:#64748b; font-size: 0.875rem;">From: ${job.supplierName}</p>
            <p style="margin: 0.5rem 0; font-weight: 600; color:#10b981;">Qty: ${job.quantity} units</p>
            <button class="btn" onclick="claimDeliveryTaskWrapper('${job.id}')">Accept Run</button>
        </div>
    `).join('');
}

// Wrapper to be called from the UI, ensures user is authenticated
window.claimDeliveryTaskWrapper = (orderId) => {
    const user = auth.currentUser;
    if (user) {
        claimDeliveryTask(orderId, user.uid);
    } else {
        alert("Please log in to accept jobs.");
        window.location.href = 'login.html'; // Redirect to login
    }
};
