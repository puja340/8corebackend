import type { NextApiRequest, NextApiResponse } from "next";
import pool from "src/lib/db";

export const updateStatus = async (req, res) => {
  try {
    const { gensetKey, status } = req.body; // gensetKey = "genset3"

    if (!gensetKey || typeof status !== "boolean") {
      return res.status(400).json({ message: "Invalid input" });
    }

    // Build column names safely
    const statusColumn = `${gensetKey}Status`;           // genset3Status
    const lastOnColumn = `${gensetKey}LastTurnedOn`;     // genset3LastTurnedOn
    const lastOffColumn = `${gensetKey}LastTurnedOff`;   // genset3LastTurnedOff

    // Validate column names (IMPORTANT SAFETY)
    const allowedColumns = [
      "genset1Status","genset2Status",
      "genset1LastTurnedOn","genset2LastTurnedOn",
      "genset1LastTurnedOff","genset2LastTurnedOff",
    ];

    if (!allowedColumns.includes(statusColumn)) {
      return res.status(400).json({ message: "Invalid genset column" });
    }

    // Build query dynamically
    let query;
    let values;

    if (status === true) {
      // Turning ON → update status + lastTurnedOn
      query = `
        UPDATE status
        SET ${statusColumn} = $1,
            ${lastOnColumn} = NOW()
        WHERE id = 1
        RETURNING *;
      `;
      values = [true];
    } else {
      // Turning OFF → update status + lastTurnedOff
      query = `
        UPDATE status
        SET ${statusColumn} = $1,
            ${lastOffColumn} = NOW()
        WHERE id = 1
        RETURNING *;
      `;
      values = [false];
    }

    const result = await pool.query(query, values);

    return res.status(200).json({
      message: "Status updated successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

