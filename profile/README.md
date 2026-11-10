# Robotiq — Open-source software tools for developers

## Software tool index

Summary of available tools, by product.

- ![Robotiq](https://img.shields.io/badge/Robotiq-blue) — official, Robotiq-maintained
- ![Third party](https://img.shields.io/badge/Third_party-lightgrey) — community-maintained

Click a badge to go to where the tool is hosted. Once there, follow that
platform's own instructions to find your way to the software tool.

### Libraries

| Product | C | C++ | Python |
|---|---|---|---|
| 2F-85 | - | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/robotiq-sdk/tree/main/grippers) | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/castetsb/pyRobotiqGripper) |
| 2F-140 | - | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/robotiq-sdk/tree/main/grippers) | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/castetsb/pyRobotiqGripper) |
| 2F-240 | - | - | - |
| Hand-E | - | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/robotiq-sdk/tree/main/grippers) | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/castetsb/pyRobotiqGripper) |
| Hand-E 100 | - | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/robotiq-sdk/tree/main/grippers) | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/castetsb/pyRobotiqGripper) |
| Hand-E C10 | - | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/robotiq-sdk/tree/main/grippers) | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/castetsb/pyRobotiqGripper) |
| Force Torque Sensor | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://robotiq.com/support) | - | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/castetsb/pyFT300) |
| Tactile Sensor | - | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/robotiq-sdk/tree/main/tsf) | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/robotiq-sdk/tree/main/tsf) |

- **C** — Compiled, performance-oriented language.
- **C++** — Compiled, performance-oriented object-oriented language.
- **Python** — Interpreted, prototyping-oriented language.

### ROS

| Product | ROS |
|---|---|
| 2F-85 | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/robotiq-ros/tree/main/grippers) |
| 2F-140 | - |
| 2F-240 | - |
| Hand-E | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/robotiq-ros/tree/main/grippers) |
| Hand-E 100 | - |
| Hand-E C10 | - |
| EPick | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/PickNikRobotics/ros2_epick_gripper) |
| Force Torque Sensor | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/panagelak/rq_fts_ros2_driver) |
| Tactile Sensor | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/robotiq-ros/tree/main/robotiq_tsf) |

### Simulation

| Product | Isaac Sim / Isaac Lab | PyBullet | MuJoCo |
|---|---|---|---|
| 2F-85 | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/isaacsim_assets/tree/main/grippers/Robotiq_2F_85) | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/ElectronicElephant/pybullet_ur5_robotiq) | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/google-deepmind/mujoco_menagerie/tree/main/robotiq_2f85) |
| 2F-140 | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/isaacsim_assets/tree/main/grippers/Robotiq_2F_140) | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/ElectronicElephant/pybullet_ur5_robotiq) | - |
| 2F-240 | - | - | - |
| Hand-E | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/isaacsim_assets/tree/main/grippers/Robotiq_Hand_E) | - | - |
| Hand-E 100 | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/isaacsim_assets/tree/main/grippers/Robotiq_Hand_E) | - | - |
| Hand-E C10 | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/isaacsim_assets/tree/main/grippers/Robotiq_Hand_E_C10) | - | - |
| Tactile Sensor | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/isaacsim_assets/tree/main/grippers) | - | - |

- **Isaac Sim / Isaac Lab** — NVIDIA Isaac Sim assets for simulating the hardware, also usable for robot learning in Isaac Lab.
- **PyBullet** — PyBullet integration for physics-based simulation.
- **MuJoCo** — MuJoCo (MJCF) model for physics-based simulation.

### AI agents

| Product | MCP |
|---|---|
| 2F-85 | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/robotiq-ros/tree/main/mcp) |
| 2F-140 | - |
| Tactile Sensor | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/robotiq-ros/tree/main/mcp) |

- **MCP** — Model Context Protocol server that lets LLM agents drive the hardware.

### Other community projects

| Product | Project |
|---|---|
| 2F-85, 2F-140 | [GraspGen](https://github.com/NVlabs/GraspGen) — NVIDIA's diffusion-based framework for 6-DOF grasping, with Robotiq gripper definitions |

## Repositories

Maintained by hand — not auto-generated. May drift as repos are added,
renamed, or archived; see [#10](https://github.com/robotiq/.github/issues/10)
for a possible automated replacement.

| Repository | Description |
|---|---|
| [isaacsim_assets](https://github.com/robotiq/isaacsim_assets) | Isaac Sim assets for Robotiq hardware |
| [robotiq-ros](https://github.com/robotiq/robotiq-ros) | ROS packages for Robotiq hardware |
| [robotiq-sdk](https://github.com/robotiq/robotiq-sdk) | Robotiq SDKs for the adaptive grippers (C++) and the Tactile Sensor (C++, Python viewer,...) |
