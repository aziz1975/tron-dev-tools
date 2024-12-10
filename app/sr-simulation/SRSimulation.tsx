"use client";

import React, { useState } from "react";
import axios from "axios";
import "../styles.css";

interface Witness {
  address: string;
  realTimeVotes: number;
  brokerage: number;
}

interface TronscanWitnessResponse {
  total: number;
  data: {
    address: string;
    realTimeVotes: number;
    brokerage: number;
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

const SRSimulation = () => {
  const [inputAddress, setInputAddress] = useState<string>("");
  const [srVotesNeeded, setSrVotesNeeded] = useState<string | number>(0);
  const [srpVotesNeeded, setSrpVotesNeeded] = useState<string | number>(0);
  const [brokerageRatio, setBrokerageRatio] = useState<number | null>(null);
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSRData = async () => {
    try {
      setError(null);

      if (!inputAddress) {
        setError("Please enter a valid TRON wallet address.");
        return;
      }

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
        brokerage: witness.brokerage / 100, // Convert brokerage to a decimal
      }));

      candidates.sort((a, b) => b.realTimeVotes - a.realTimeVotes);

      const userRank = candidates.findIndex(
        (candidate) => candidate.address === inputAddress
      );
      const userVotes = userRank >= 0 ? candidates[userRank].realTimeVotes : 0;
      const brokerageRatioValue = userRank >= 0 ? candidates[userRank].brokerage : 0.2;
      setBrokerageRatio(brokerageRatioValue);

      const isSR = userRank >= 0 && userRank < 27;
      const isSRP = userRank >= 27 && userRank < 127;

      const srThreshold = candidates[26]?.realTimeVotes || 0;
      const srpThreshold = candidates[126]?.realTimeVotes || 0;

      const votesNeededForSR = isSR ? "Already an SR" : srThreshold - userVotes;
      const votesNeededForSRP = isSR
        ? "N/A"
        : isSRP
        ? "Already an SRP"
        : srpThreshold - userVotes;

      setSrVotesNeeded(votesNeededForSR);
      setSrpVotesNeeded(votesNeededForSRP);

      const priceResponse = await axios.get<{ tron: { usd: number } }>(
        "https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd"
      );
      const trxPriceUSD = priceResponse.data.tron.usd;

      const eligibleCandidates = candidates.slice(0, 127);
      const totalNetworkVotes = eligibleCandidates.reduce(
        (sum, candidate) => sum + candidate.realTimeVotes,
        0
      );
      
      const blocksProduced = isSR ? 1600 : 0;

      const dailyBlockRewardsBeforeBrokerage = blocksProduced * 16;
      const dailyBlockRewardsAfterBrokerage =
        dailyBlockRewardsBeforeBrokerage * (1 - brokerageRatioValue);

      const isEligibleForVoteRewards = userRank >= 0 && userRank < 127;
      const dailyVoteRewardsBeforeBrokerage = isEligibleForVoteRewards
        ? (userVotes / totalNetworkVotes) * 115200
        : 0;
      const dailyVoteRewardsAfterBrokerage =
        dailyVoteRewardsBeforeBrokerage * (1 - brokerageRatioValue);

      const dailyTotalRewards =
        dailyBlockRewardsAfterBrokerage + dailyVoteRewardsAfterBrokerage;
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
    <div className="container">
      <h1 style={{ color: '#333', textAlign: 'center', marginBottom: '20px', fontSize: '36px', fontWeight: 'bold' }}>
  SR / SRP Rewards Simulator
</h1>
      <div className="form-group">
        <label htmlFor="tron-address">Enter your TRON Wallet Address:</label>
        <input
          id="tron-address"
          type="text"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          placeholder="Enter TRON Wallet Address"
        />
        <button onClick={fetchSRData}>Simulate</button>
      </div>

      {error && <p className="error">{error}</p>}

      {brokerageRatio !== null && (
        <p>Brokerage Ratio: {(brokerageRatio * 100).toFixed(2)}%</p>
      )}

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
          <h3>Daily Rewards:</h3>
          <p>Block Rewards (Before Brokerage): {rewards.daily.blockBeforeBrokerage.toFixed(2)} TRX</p>
          <p>Vote Rewards (Before Brokerage): {rewards.daily.voteBeforeBrokerage.toFixed(2)} TRX</p>
          <p>Block Rewards (After Brokerage): {rewards.daily.blockAfterBrokerage.toFixed(2)} TRX</p>
          <p>Vote Rewards (After Brokerage): {rewards.daily.voteAfterBrokerage.toFixed(2)} TRX</p>
          <p>Total Daily Rewards (After Brokerage): {rewards.daily.total.toFixed(2)} TRX</p>
          <h3>Monthly Rewards:</h3>
          <p>Block Rewards (Before Brokerage): {rewards.monthly.blockBeforeBrokerage.toFixed(2)} TRX</p>
          <p>Vote Rewards (Before Brokerage): {rewards.monthly.voteBeforeBrokerage.toFixed(2)} TRX</p>
          <p>Block Rewards (After Brokerage): {rewards.monthly.blockAfterBrokerage.toFixed(2)} TRX</p>
          <p>Vote Rewards (After Brokerage): {rewards.monthly.voteAfterBrokerage.toFixed(2)} TRX</p>
          <p>Total Monthly Rewards (After Brokerage): {rewards.monthly.total.toFixed(2)} TRX</p>
        </div>
      )}
    </div>
  );
};

export default SRSimulation;
