// pages/api/genset/status.js
// import pool from '../../../lib/db'; // your PostgreSQL pool connect
import pool from "src/lib/db";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { gensetNumber, status } = req.body;

  if (!gensetNumber || typeof status !== 'boolean') {
    return res.status(400).json({ message: 'Invalid request data' });
  }

  const columnName = `genset${gensetNumber}Status`; // dynamic column
  const query = `UPDATE status SET "${columnName}" = $1`; // quote to avoid case issues

  

  try {
    await pool.query(query, [status]);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
// sample request
// try{
//   const response = await fetch('/api/genset/status', {
//     method: 'POST',
//     headers: {
//       Content-Type: 'application/json',
//     },
//     Body.stringify({ gensetNumber: 1, status: true})
//   });
//   const data = await response.json();
//   const success = data.success;
//   console.log("Genset")
// console.log("Genset status update success:", success);
// } catch (error){
// }
//   })
// }