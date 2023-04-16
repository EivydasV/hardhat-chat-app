import { expect } from "chai";
import { ethers } from "hardhat";
import { Chat } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Chat", function () {
  let contract: Chat;
  let owner: SignerWithAddress;
  let simpleUser: SignerWithAddress;

  it("Should return the new greeting once it's changed", async function () {
    beforeEach(async () => {
      [owner, simpleUser] = await ethers.getSigners();
      const Chat = await ethers.getContractFactory("Chat");
      const chat = await Chat.deploy();
      contract = await chat.deployed();
    });
  });

  const createUser = async (name: string, from?: SignerWithAddress) => {
    if (from) {
      return contract.connect(from).createUser(name);
    }

    return contract.createUser(name);
  };

  it("Should fail create user if user already exist", async () => {
    const userName = "user";
    await createUser(userName);
    await expect(createUser(userName)).to.be.revertedWith("User already exist");
  });

  it("should fail create user if name is empty", async () => {
    await expect(createUser("")).to.be.revertedWith("Name is required");
  });

  it("should fail create user if name is too long", async () => {
    const name = "a".repeat(33);
    await expect(createUser(name)).to.be.revertedWith(
      "Name cannot be longer than 32 characters"
    );
  });

  it("should create userr successfully", async () => {
    const name = "user";
    await createUser(name);

    const inAllUsers = await contract.allUsers(0);

    expect(inAllUsers[0]).to.be.equal(owner.address);
    expect(inAllUsers[1]).to.be.equal(name);

    const inUsers = await contract.users(owner.address);

    expect(inUsers).to.be.equal(name);
  });

  it("should fail get username if user does not exist", async () => {
    await expect(contract.getUserName(owner.address)).to.be.revertedWith(
      "User does not exist"
    );
  });

  it("should get username successfully", async () => {
    const name = "user";
    await createUser(name);

    const userName = await contract.getUserName(owner.address);

    expect(userName).to.be.equal(name);
  });

  it("should fail add friend if user is not registered", async () => {
    await expect(
      contract.addFriend(simpleUser.address, "fdfd")
    ).to.be.revertedWith("User does not exist");
  });

  it("should fail add friend if friend is not registered", async () => {
    await createUser("user");
    await expect(
      contract.addFriend(simpleUser.address, "fdfd")
    ).to.be.revertedWith("Friend does not exist");
  });

  it("should fail add friend if sender is trying add himself as a friend", async () => {
    await createUser("user");
    await expect(contract.addFriend(owner.address, "fdfd")).to.be.revertedWith(
      "You cannot add yourself as a friend"
    );
  });

  it("should fail add friend if friend is already added", async () => {
    await Promise.all([createUser("user"), createUser("friend", simpleUser)]);

    await contract.addFriend(simpleUser.address, "fdfd");
    await expect(
      contract.addFriend(simpleUser.address, "fdfd")
    ).to.be.revertedWith("You are already friends");
  });

  it("should add friend successfully for caller and friend", async () => {
    await Promise.all([createUser("user"), createUser("friend", simpleUser)]);
    await contract.addFriend(simpleUser.address, "fdfd");

    const [userFriends, friendFriends] = await Promise.all([
      contract.getMyFriends(),
      contract.connect(simpleUser).getMyFriends(),
    ]);

    expect(userFriends[0][0]).to.be.equal(simpleUser.address);
    expect(friendFriends[0][0]).to.be.equal(owner.address);
  });

  it("should fail send message if user is not registered", async () => {
    await expect(
      contract.sendMessage(simpleUser.address, "fdfd")
    ).to.be.revertedWith("User does not exist");
  });

  it("should fail send message if friend is not registered", async () => {
    await createUser("user");
    await expect(
      contract.sendMessage(simpleUser.address, "fdfd")
    ).to.be.revertedWith("Friend does not exist");
  });

  it("should fail send message if sender trying send message to not friend", async () => {
    await Promise.all([createUser("user"), createUser("friend", simpleUser)]);
    await expect(
      contract.sendMessage(simpleUser.address, "fdfd")
    ).to.be.revertedWith("You are not friends");
  });

  it("should fail send message if message is empty", async () => {
    await Promise.all([createUser("user"), createUser("friend", simpleUser)]);
    await contract.addFriend(simpleUser.address, "fdfd");
    await expect(
      contract.sendMessage(simpleUser.address, "")
    ).to.be.revertedWith("Message is required");
  });

  it("should fail send message if message is too long", async () => {
    await Promise.all([createUser("user"), createUser("friend", simpleUser)]);
    await contract.addFriend(simpleUser.address, "fdfd");
    const message = "a".repeat(257);
    await expect(
      contract.sendMessage(simpleUser.address, message)
    ).to.be.revertedWith("Message cannot be longer than 256 characters");
  });

  it("should fail send message if sender trying send message to himself", async () => {
    await Promise.all([createUser("user"), createUser("friend", simpleUser)]);
    await contract.addFriend(simpleUser.address, "fdfd");
    await expect(
      contract.sendMessage(owner.address, "fdfd")
    ).to.be.revertedWith("You are not friends");
  });

  it("should send message successfully", async () => {
    const message = "boom";
    await Promise.all([createUser("user"), createUser("friend", simpleUser)]);
    await contract.addFriend(simpleUser.address, "name");
    await contract.sendMessage(simpleUser.address, message);

    const [userMessages, friendMessages] = await Promise.all([
      contract.getMessages(simpleUser.address),
      contract.connect(simpleUser).getMessages(owner.address),
    ]);

    expect(userMessages[0][0]).to.be.equal(owner.address);
    expect(userMessages[0][1]).to.be.equal(message);

    expect(friendMessages[0][0]).to.be.equal(owner.address);
    expect(friendMessages[0][1]).to.be.equal(message);
  });

  it("should fail get messages if user is not registered", async () => {
    await expect(contract.getMessages(simpleUser.address)).to.be.revertedWith(
      "User does not exist. Create an account first."
    );
  });

  it("should fail get messages if friend is not registered", async () => {
    await createUser("user");
    await expect(contract.getMessages(simpleUser.address)).to.be.revertedWith(
      "Friend does not exist"
    );
  });

  it("should fail if receiver is not a friend", async () => {
    await Promise.all([createUser("user"), createUser("friend", simpleUser)]);
    await expect(contract.getMessages(simpleUser.address)).to.be.revertedWith(
      "You are not friends"
    );
  });

  it("should get messages successfully", async () => {
    const message = "boom";
    await Promise.all([createUser("user"), createUser("friend", simpleUser)]);
    await contract.addFriend(simpleUser.address, "name");
    await contract.sendMessage(simpleUser.address, message);

    const messages = await contract.getMessages(simpleUser.address);

    expect(messages[0][0]).to.be.equal(owner.address);
    expect(messages[0][1]).to.be.equal(message);
  });

  it("should get all users successfully", async () => {
    await Promise.all([createUser("user"), createUser("friend", simpleUser)]);

    const users = await contract.getAllUsers();

    expect(users[0][0]).to.be.equal(owner.address);
    expect(users[0][1]).to.be.equal("user");
    expect(users[1][0]).to.be.equal(simpleUser.address);
    expect(users[1][1]).to.be.equal("friend");
  });
});
