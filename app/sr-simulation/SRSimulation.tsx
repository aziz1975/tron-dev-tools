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
  const [trxPriceUSD, setTrxPriceUSD] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const formatNumberWithCommas = (number: number) =>
    number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const calculateUSD = (trxAmount: number) => {
    return `$${formatNumberWithCommas(trxAmount * trxPriceUSD)}`;
  };

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
            "TRON-PRO-API-KEY": process.env.TRON_PRO_API_KEY || "",
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
      const trxPriceUSDValue = priceResponse.data.tron.usd;
      setTrxPriceUSD(trxPriceUSDValue);

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
          usd: dailyTotalRewards * trxPriceUSDValue,
        },
        monthly: {
          blockBeforeBrokerage: dailyBlockRewardsBeforeBrokerage * 30,
          voteBeforeBrokerage: dailyVoteRewardsBeforeBrokerage * 30,
          blockAfterBrokerage: dailyBlockRewardsAfterBrokerage * 30,
          voteAfterBrokerage: dailyVoteRewardsAfterBrokerage * 30,
          total: monthlyTotalRewards,
          usd: monthlyTotalRewards * trxPriceUSDValue,
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
            Votes needed to become SR:{" "}
            <strong>{typeof srVotesNeeded === "number" ? srVotesNeeded : srVotesNeeded}</strong>
          </p>
          <p>
            Votes needed to become SRP:{" "}
            <strong>{typeof srpVotesNeeded === "number" ? srpVotesNeeded : srpVotesNeeded}</strong>
          </p>
          <h3>Daily Rewards:</h3>
          <p>
            Block Rewards (Before Brokerage): {formatNumberWithCommas(rewards.daily.blockBeforeBrokerage)} TRX{" "}
            ({calculateUSD(rewards.daily.blockBeforeBrokerage)})
          </p>
          <p>
            Vote Rewards (Before Brokerage): {formatNumberWithCommas(rewards.daily.voteBeforeBrokerage)} TRX{" "}
            ({calculateUSD(rewards.daily.voteBeforeBrokerage)})
          </p>
          <p>
            Block Rewards (After Brokerage): {formatNumberWithCommas(rewards.daily.blockAfterBrokerage)} TRX{" "}
            ({calculateUSD(rewards.daily.blockAfterBrokerage)})
          </p>
          <p>
            Vote Rewards (After Brokerage): {formatNumberWithCommas(rewards.daily.voteAfterBrokerage)} TRX{" "}
            ({calculateUSD(rewards.daily.voteAfterBrokerage)})
          </p>
          <p>
            Total Daily Rewards (After Brokerage): {formatNumberWithCommas(rewards.daily.total)} TRX{" "}
            (${formatNumberWithCommas(rewards.daily.usd)})
          </p>
          <h3>Monthly Rewards:</h3>
          <p>
            Block Rewards (Before Brokerage): {formatNumberWithCommas(rewards.monthly.blockBeforeBrokerage)} TRX{" "}
            ({calculateUSD(rewards.monthly.blockBeforeBrokerage)})
          </p>
          <p>
            Vote Rewards (Before Brokerage): {formatNumberWithCommas(rewards.monthly.voteBeforeBrokerage)} TRX{" "}
            ({calculateUSD(rewards.monthly.voteBeforeBrokerage)})
          </p>
          <p>
            Block Rewards (After Brokerage): {formatNumberWithCommas(rewards.monthly.blockAfterBrokerage)} TRX{" "}
            ({calculateUSD(rewards.monthly.blockAfterBrokerage)})
          </p>
          <p>
            Vote Rewards (After Brokerage): {formatNumberWithCommas(rewards.monthly.voteAfterBrokerage)} TRX{" "}
            ({calculateUSD(rewards.monthly.voteAfterBrokerage)})
          </p>
          <p>
            Total Monthly Rewards (After Brokerage): {formatNumberWithCommas(rewards.monthly.total)} TRX{" "}
            (${formatNumberWithCommas(rewards.monthly.usd)})
          </p>
        </div>
      )}
    </div>
  );
};

export default SRSimulation;
