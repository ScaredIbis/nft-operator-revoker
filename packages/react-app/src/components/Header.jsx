import { PageHeader } from "antd";
import React from "react";

// displays a page header

export default function Header({ onShowHelpModal }) {
  return (
    <>
      <div onClick={onShowHelpModal}>
        <PageHeader
          title="Revoke NFT Operator Approvals"
          subTitle="What is this?"
          style={{ cursor: "pointer" }}
          onClick
        />
      </div>
      <p>
        <strong>
          Hacked together by{" "}
          <a target="_blank" href="https://github.com/scaredibis" rel="noreferrer">
            rogueibis
          </a>
        </strong>
      </p>
    </>
  );
}
