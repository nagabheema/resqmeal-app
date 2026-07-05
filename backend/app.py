from flask import Flask, request, jsonify  # type: ignore
from flask_cors import CORS # pyright: ignore[reportMissingModuleSource]
from datetime import datetime, timedelta
import firebase_admin # pyright: ignore[reportMissingImports]
from firebase_admin import credentials, firestore # pyright: ignore[reportMissingImports]

app = Flask(__name__)
CORS(app) 

# Initialize Firebase Admin.
# The SDK will automatically use the service account credentials specified
# in the GOOGLE_APPLICATION_CREDENTIALS environment variable.
firebase_admin.initialize_app()
db = firestore.client()

@app.route('/api/supplies/create', methods=['POST'])
def create_supply_batch():
    data = request.json
    if not data:
        return jsonify({"success": False, "error": "Invalid JSON"}), 400

    try:
        quantity = int(data['quantity'])
        expiry_hours = int(data['expiryHours'])
        new_batch = {
            "foodType": data['foodType'],
            "name": data['name'],
            "quantity": quantity,
            "expiryTimestamp": datetime.utcnow() + timedelta(hours=expiry_hours),
            "geoLocation": data['geoLocation'],
            "supplierName": data['supplierName'],
            "status": "pending_review",
            "qualityChecked": False,
            "loadChecked": False,
            "created_at": datetime.utcnow()
        }
        db.collection('orders').add(new_batch)
        return jsonify({"success": True, "message": "Batch sent to reviewer."}), 201
    except (KeyError, TypeError):
        return jsonify({"success": False, "error": "Missing or invalid required fields."}), 400
    except ValueError:
        return jsonify({"success": False, "error": "quantity and expiryHours must be integers."}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/reviewer/approve', methods=['POST'])
def reviewer_approve_batch():
    data = request.json
    order_id = data.get('orderId') if data else None
    if not order_id:
        return jsonify({"success": False, "error": "orderId is required."}), 400

    try:
        order_ref = db.collection('orders').document(order_id)
        if not order_ref.get().exists:
            return jsonify({"success": False, "error": "Order not found."}), 404

        order_ref.update({
            "status": "approved",
            "qualityChecked": True,
            "loadChecked": True,
            "reviewedAt": datetime.utcnow()
        })
        return jsonify({"success": True, "message": "Batch released to fleet."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/orders', methods=['GET'])
def get_available_orders():
    try:
        query = db.collection('orders').where('status', '==', 'approved').order_by('expiryTimestamp').stream()
        prioritized_jobs = [{"id": doc.id, **doc.to_dict()} for doc in query]
        return jsonify({"success": True, "data": prioritized_jobs}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/orders/accept', methods=['POST'])
def accept_order():
    data = request.json
    order_id = data.get('orderId') if data else None
    rider_id = data.get('riderId') if data else None

    if not all([order_id, rider_id]):
        return jsonify({"success": False, "error": "orderId and riderId are required."}), 400

    try:
        order_ref = db.collection('orders').document(order_id)
        order_doc = order_ref.get()

        if not order_doc.exists:
            return jsonify({"success": False, "error": "Order not found."}), 404
        
        order_data = order_doc.to_dict()
        if order_data.get('status') != 'approved':
            return jsonify({"success": False, "error": "Order is not available for acceptance."}), 409

        order_ref.update({
            "status": "accepted",
            "riderId": rider_id,
            "acceptedAt": datetime.utcnow()
        })
        return jsonify({"success": True, "message": "Order accepted successfully."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
