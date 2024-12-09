"use client";

import React, { useState } from "react";
import axios from "axios";
import "./styles.css"; // Include a CSS file for styling

interface Witness {
  address: string;
  realTimeVotes: number;
}

interface TronscanWitnessResponse {
  total: number;
  data: {
    address: string;
    realTimeVotes: number;
  }[];
}

interface Rewards {
  daily: {
    blockBeforeBrokerage: number;
    voteBeforeBrokerage: number;
    blockAfterBrokerage: number;
    voteAfterBrokerage: number;
    total: number;
    usd: number;
  };
  monthly: {
    blockBeforeBrokerage: number;
    voteBeforeBrokerage: number;
    blockAfterBrokerage: number;
    voteAfterBrokerage: number;
    total: number;
    usd: number;
  };
}

const Page = () => {
  const [inputAddress, setInputAddress] = useState<string>("");
  const [srVotesNeeded, setSrVotesNeeded] = useState<string | number>(0);
  const [srpVotesNeeded, setSrpVotesNeeded] = useState<string | number>(0);
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSRData = async () => {
    try {
      setError(null);

      if (!inputAddress) {
        setError("Please enter a valid TRON wallet address.");
        return;
      }

      // Step 1: Fetch witness data from Tronscan API with API key
      const witnessResponse = await axios.get<TronscanWitnessResponse>(
        "https://apilist.tronscanapi.com/api/pagewitness?witnesstype=0",
        {
          headers: {
            "TRON-PRO-API-KEY": "0a131fa9-e9bc-411d-b749-56583caa0b3b",
          },
        }
      );
      const candidates: Witness[] = witnessResponse.data.data.map((witness) => ({
        address: witness.address,
        realTimeVotes: witness.realTimeVotes,
      }));

      // Sort by realTimeVotes in descending order
      candidates.sort((a, b) => b.realTimeVotes - a.realTimeVotes);

      // Find the rank of the user
      const userRank = candidates.findIndex(
        (candidate) => candidate.address === inputAddress
      );
      const userVotes = userRank >= 0 ? candidates[userRank].realTimeVotes : 0;

      const isSR = userRank >= 0 && userRank < 27; // Top 27 are SRs
      const isSRP = userRank >= 27 && userRank < 127; // Ranks 27–126 are SRPs

      const srThreshold = candidates[26]?.realTimeVotes || 0;
      const srpThreshold = candidates[126]?.realTimeVotes || 0;

      // Votes needed
      const votesNeededForSR = isSR ? "Already an SR" : srThreshold - userVotes;
      const votesNeededForSRP = isSR
        ? "N/A"
        : isSRP
        ? "Already an SRP"
        : srpThreshold - userVotes;

      setSrVotesNeeded(votesNeededForSR);
      setSrpVotesNeeded(votesNeededForSRP);

      // Step 2: Fetch TRX/USD price
      const priceResponse = await axios.get<{
        tron: { usd: number };
      }>("https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd");
      const trxPriceUSD = priceResponse.data.tron.usd;

      // Step 3: Calculate rewards with brokerage ratio
      const brokerageRatio = 0.20; // SR/SRP retains 20%
      const voterShareRatio = 1 - brokerageRatio; // Voters get 80%

      const totalNetworkVotes = candidates.reduce(
        (sum, candidate) => sum + candidate.realTimeVotes,
        0
      );
      const blocksProduced = isSR ? 1600 : 0; // Only SRs produce blocks

      // Calculate block rewards
      const dailyBlockRewardsBeforeBrokerage = blocksProduced * 16; // Block rewards before brokerage
      const dailyBlockRewardsAfterBrokerage = dailyBlockRewardsBeforeBrokerage * voterShareRatio; // Block rewards after brokerage

      // Calculate vote rewards only for eligible ranks
      const isEligibleForVoteRewards = userRank >= 0 && userRank < 127;
      const dailyVoteRewardsBeforeBrokerage = isEligibleForVoteRewards
        ? (userVotes / totalNetworkVotes) * 115200
        : 0; // No rewards for ranks >= 128
      const dailyVoteRewardsAfterBrokerage = dailyVoteRewardsBeforeBrokerage * voterShareRatio;

      // Calculate total rewards
      const dailyTotalRewards = dailyBlockRewardsAfterBrokerage + dailyVoteRewardsAfterBrokerage;
      const monthlyTotalRewards = dailyTotalRewards * 30;

      const calculatedRewards: Rewards = {
        daily: {
          blockBeforeBrokerage: dailyBlockRewardsBeforeBrokerage,
          voteBeforeBrokerage: dailyVoteRewardsBeforeBrokerage,
          blockAfterBrokerage: dailyBlockRewardsAfterBrokerage,
          voteAfterBrokerage: dailyVoteRewardsAfterBrokerage,
          total: dailyTotalRewards,
          usd: dailyTotalRewards * trxPriceUSD,
        },
        monthly: {
          blockBeforeBrokerage: dailyBlockRewardsBeforeBrokerage * 30,
          voteBeforeBrokerage: dailyVoteRewardsBeforeBrokerage * 30,
          blockAfterBrokerage: dailyBlockRewardsAfterBrokerage * 30,
          voteAfterBrokerage: dailyVoteRewardsAfterBrokerage * 30,
          total: monthlyTotalRewards,
          usd: monthlyTotalRewards * trxPriceUSD,
        },
      };

      setRewards(calculatedRewards);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data. Please try again.");
    }
  };

  return (
    <div className="container" style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1 style={{ color: '#333', textAlign: 'center', marginBottom: '20px', fontSize: '36px', fontWeight: 'bold' }}>
  SR / SRP Rewards Simulator
</h1>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="tron-address" style={{ marginRight: '10px', fontWeight: 'bold' }}>Enter your TRON Wallet Address:</label>
        <input
          id="tron-address"
          type="text"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          placeholder="Enter TRON Wallet Address"
          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '300px', marginRight: '10px' }}
        />
        <button
          onClick={fetchSRData}
          style={{
            backgroundColor: '#007bff',
            color: '#fff',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Simulate
        </button>
      </div>

      {error && <p style={{ color: "red", fontWeight: 'bold' }}>{error}</p>}

      {rewards && (
        <div>
          <h2 style={{ color: '#333', marginTop: '20px' }}>Results:</h2>
          <p>
            Votes needed to become SR: {" "}
            <strong>{typeof srVotesNeeded === "number" ? srVotesNeeded : srVotesNeeded}</strong>
          </p>
          <p>
            Votes needed to become SRP: {" "}
            <strong>{typeof srpVotesNeeded === "number" ? srpVotesNeeded : srpVotesNeeded}</strong>
          </p>
          <h3 style={{ color: '#555' }}>Daily Rewards:</h3>
          <p>Block Rewards (Before Brokerage): <strong>{rewards.daily.blockBeforeBrokerage.toFixed(2)} TRX</strong></p>
          <p>Vote Rewards (Before Brokerage): <strong>{rewards.daily.voteBeforeBrokerage.toFixed(2)} TRX</strong></p>
          <p>Block Rewards (After Brokerage): <strong>{rewards.daily.blockAfterBrokerage.toFixed(2)} TRX</strong></p>
          <p>Vote Rewards (After Brokerage): <strong>{rewards.daily.voteAfterBrokerage.toFixed(2)} TRX</strong></p>
          <p>Total Daily Rewards: <strong>{rewards.daily.total.toFixed(2)} TRX</strong> ($
            {rewards.daily.usd.toFixed(2)})</p>
          <h3 style={{ color: '#555' }}>Monthly Rewards:</h3>
          <p>Block Rewards (Before Brokerage): <strong>{rewards.monthly.blockBeforeBrokerage.toFixed(2)} TRX</strong></p>
          <p>Vote Rewards (Before Brokerage): <strong>{rewards.monthly.voteBeforeBrokerage.toFixed(2)} TRX</strong></p>
          <p>Block Rewards (After Brokerage): <strong>{rewards.monthly.blockAfterBrokerage.toFixed(2)} TRX</strong></p>
          <p>Vote Rewards (After Brokerage): <strong>{rewards.monthly.voteAfterBrokerage.toFixed(2)} TRX</strong></p>
          <p>Total Monthly Rewards: <strong>{rewards.monthly.total.toFixed(2)} TRX</strong> ($
            {rewards.monthly.usd.toFixed(2)})</p>
        </div>
      )}
    </div>
  );
};

export default Page;
