import React, { useState } from "react";
import Chatbot from "./ChatbotCOR";
import { RiChatSmile3Line } from "react-icons/ri";
import "./FloatingChatbotCOR.css"; // styles below

const FloatingChatbotCOR = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div className={`chatbot-popup ${isOpen ? "open" : ""}`}>
        <Chatbot />
      </div>
      <button className="chatbot-toggle-btn" onClick={toggleChat}>
        <RiChatSmile3Line size={24} />
      </button>
    </>
  );
};

export default FloatingChatbotCOR;
