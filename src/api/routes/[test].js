/*
    Type: GET
    Do not delete this section
*/

module.exports = (req, res) => {
    const { test } = req.params;

    res.json({ message: `You sent: ${test}` });
};
